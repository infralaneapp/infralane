import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/auth/permissions";
import type { TicketActor } from "@/modules/tickets/service";

export type TicketStats = {
  total: number;
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  byAssignee: { name: string; count: number }[];
  recentCount: number;
};

export type StatsFilters = {
  from?: string;
  to?: string;
  type?: string;
  priority?: string;
  assigneeId?: string;
};

export async function getTicketStats(actor: TicketActor, filters?: StatsFilters): Promise<TicketStats> {
  const where: Record<string, unknown> = {};

  if (filters?.from || filters?.to) {
    where.createdAt = {};
    if (filters.from) (where.createdAt as Record<string, unknown>).gte = new Date(filters.from);
    if (filters.to) (where.createdAt as Record<string, unknown>).lte = new Date(filters.to + "T23:59:59.999Z");
  }
  if (filters?.type) where.ticketTypeId = filters.type;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.assigneeId) where.assigneeId = filters.assigneeId;

  const [
    total,
    byStatus,
    byType,
    byAssignee,
    recentCount,
  ] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.groupBy({
      by: ["status"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.ticket.groupBy({
      by: ["ticketTypeId"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.ticket.findMany({
      where: { ...where, assigneeId: { not: null } },
      select: {
        assignee: { select: { name: true } },
      },
    }),
    prisma.ticket.count({
      where: {
        ...where,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          ...(filters?.to ? { lte: new Date(filters.to + "T23:59:59.999Z") } : {}),
        },
      },
    }),
  ]);

  const ticketTypes = await prisma.ticketType.findMany({
    select: { id: true, name: true },
  });
  const typeMap = new Map(ticketTypes.map((t) => [t.id, t.name]));

  const assigneeCounts = new Map<string, number>();
  for (const t of byAssignee) {
    if (t.assignee) {
      assigneeCounts.set(t.assignee.name, (assigneeCounts.get(t.assignee.name) ?? 0) + 1);
    }
  }

  return {
    total,
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
    byType: byType.map((t) => ({
      type: typeMap.get(t.ticketTypeId) ?? "Unknown",
      count: t._count.id,
    })),
    byAssignee: Array.from(assigneeCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    recentCount,
  };
}

export type QueueSummary = {
  open: number;
  mine: number;
  stale: number;
  awaitingResponse: number;
  recentlyResolved: number;
};

export async function getQueueSummary(actor: TicketActor): Promise<QueueSummary> {
  const isAdmin = isStaffRole(actor.role);
  const ownerWhere = isAdmin ? {} : { requesterId: actor.id };
  const staleThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [open, mine, stale, awaitingResponse, recentlyResolved] = await Promise.all([
    prisma.ticket.count({
      where: { status: "OPEN", ...ownerWhere },
    }),
    isAdmin
      ? prisma.ticket.count({
          where: { assigneeId: actor.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
        })
      : Promise.resolve(0),
    isAdmin
      ? prisma.ticket.count({
          where: {
            status: { in: ["OPEN", "IN_PROGRESS"] },
            updatedAt: { lt: staleThreshold },
          },
        })
      : Promise.resolve(0),
    prisma.ticket.count({
      where: { status: "WAITING_FOR_REQUESTER", ...ownerWhere },
    }),
    !isAdmin
      ? prisma.ticket.count({
          where: {
            requesterId: actor.id,
            status: "RESOLVED",
            resolvedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        })
      : Promise.resolve(0),
  ]);

  return { open, mine, stale, awaitingResponse, recentlyResolved };
}
