import { TicketActivityType, TicketStatus, UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hasPermission, isStaffRole } from "@/lib/auth/permissions";
import { createTicketActivity } from "@/modules/tickets/activity";
import { normalizeTicketFields, parseTicketFieldSchema, validateTicketFields } from "@/modules/tickets/field-schema";
import { notifyAssignment, notifyStatusChange } from "@/modules/notifications/service";
import { emitTrigger } from "@/modules/automation/triggers";
import { formatTicketReference } from "@/modules/tickets/serializers";
import {
  serializeTicketDetail,
  serializeTicketSummary,
  serializeTicketType,
  serializeUser,
  ticketDetailArgs,
  ticketSummaryArgs,
  userSelect,
} from "@/modules/tickets/serializers";
import type {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsFilterInput,
  UpdateTicketInput,
  UpdateTicketStatusInput,
} from "@/modules/tickets/schemas";

export type TicketActor = {
  id: string;
  role: UserRole;
};

function isAdmin(actor: TicketActor) {
  return isStaffRole(actor.role);
}

function buildTicketVisibilityWhere(actor: TicketActor) {
  return isAdmin(actor)
    ? {}
    : {
        requesterId: actor.id,
      };
}

function assertDevops(actor: TicketActor, message: string) {
  if (!isAdmin(actor)) {
    throw new AppError(message, {
      status: 403,
      code: "FORBIDDEN",
    });
  }
}

async function getTicketRecord(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    ...ticketDetailArgs,
  });
}

async function getAccessibleTicket(id: string, actor: TicketActor) {
  return prisma.ticket.findFirst({
    where: {
      id,
      ...buildTicketVisibilityWhere(actor),
    },
    ...ticketDetailArgs,
  });
}

export async function assertTicketAccess(ticketId: string, actor: TicketActor) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      ...buildTicketVisibilityWhere(actor),
    },
    select: { id: true },
  });

  if (!ticket) {
    throw new AppError("Ticket not found.", { status: 404, code: "TICKET_NOT_FOUND" });
  }

  return ticket;
}

export async function listAllUsers() {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: userSelect,
  });
  return users.map((user) => serializeUser(user)!);
}

export async function listAssignableUsers(actor?: TicketActor) {
  if (actor && !isAdmin(actor)) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.OPERATOR, UserRole.ADMIN] },
    },
    orderBy: {
      name: "asc",
    },
    select: userSelect,
  });

  return users.map((user) => serializeUser(user)!);
}

export async function listTicketTypes() {
  const ticketTypes = await prisma.ticketType.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return ticketTypes.map(serializeTicketType);
}

export async function listTickets(filters: Partial<ListTicketsFilterInput> = {}, actor: TicketActor) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  // Mine/all toggle
  const assigneeFilter = filters.view === "mine"
    ? actor.id
    : filters.assigneeId === "unassigned" ? null : filters.assigneeId;

  // Search
  const searchFilter = filters.q?.trim()
    ? (() => {
        const q = filters.q!.trim();
        const seqMatch = q.match(/^(?:INF-?)?(\d+)$/i);
        if (seqMatch) {
          return { sequence: parseInt(seqMatch[1], 10) };
        }
        return {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        };
      })()
    : undefined;

  const where = {
    ...buildTicketVisibilityWhere(actor),
    ...searchFilter,
    status: filters.status,
    ticketType: filters.type ? { key: filters.type } : undefined,
    assigneeId: assigneeFilter,
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      ...ticketSummaryArgs,
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    tickets: tickets.map(serializeTicketSummary),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getTicketById(id: string, actor: TicketActor) {
  const ticket = await getAccessibleTicket(id, actor);
  return ticket ? serializeTicketDetail(ticket) : null;
}

export async function createTicket(input: CreateTicketInput, actorId: string) {
  const ticketType = await prisma.ticketType.findUnique({
    where: {
      key: input.ticketTypeKey,
    },
  });

  if (!ticketType) {
    throw new AppError("Ticket type was not found.", {
      status: 404,
      code: "TICKET_TYPE_NOT_FOUND",
    });
  }

  const structuredFields = normalizeTicketFields(input.fields);
  validateTicketFields(parseTicketFieldSchema(ticketType.fieldSchema), structuredFields);

  const ticket = await prisma.$transaction(async (tx) => {
    const createdTicket = await tx.ticket.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        priority: input.priority,
        requesterId: actorId,
        ticketTypeId: ticketType.id,
        fields: structuredFields.length
          ? {
              create: structuredFields,
            }
          : undefined,
      },
      ...ticketDetailArgs,
    });

    await createTicketActivity(tx, {
      ticketId: createdTicket.id,
      actorId,
      type: TicketActivityType.CREATED,
      message: `Ticket created as ${ticketType.name}.`,
      metadata: {
        ticketTypeKey: ticketType.key,
      },
    });

    return tx.ticket.findUniqueOrThrow({
      where: { id: createdTicket.id },
      ...ticketDetailArgs,
    });
  });

  emitTrigger("TICKET_CREATED", ticket.id).catch(() => {});

  return serializeTicketDetail(ticket);
}

export async function updateTicket(id: string, input: UpdateTicketInput, actor: TicketActor) {
  assertDevops(actor, "Only operators and admins can update ticket details.");

  const existingTicket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      ticketType: true,
    },
  });

  if (!existingTicket) {
    throw new AppError("Ticket not found.", {
      status: 404,
      code: "TICKET_NOT_FOUND",
    });
  }

  const structuredFields = input.fields ? normalizeTicketFields(input.fields) : undefined;

  if (structuredFields) {
    validateTicketFields(parseTicketFieldSchema(existingTicket.ticketType.fieldSchema), structuredFields);
  }

  const changedFields = [
    input.title !== undefined ? "title" : null,
    input.description !== undefined ? "description" : null,
    structuredFields ? "structured_fields" : null,
  ].filter(Boolean);

  const ticket = await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id },
      data: {
        title: input.title?.trim(),
        description:
          input.description === undefined ? undefined : input.description?.trim() || null,
        fields: structuredFields
          ? {
              deleteMany: {},
              create: structuredFields,
            }
          : undefined,
      },
      ...ticketDetailArgs,
    });

    await createTicketActivity(tx, {
      ticketId: id,
      actorId: actor.id,
      type: TicketActivityType.UPDATED,
      message: "Ticket details updated.",
      metadata: {
        changedFields,
      },
    });

    return tx.ticket.findUniqueOrThrow({
      where: { id },
      ...ticketDetailArgs,
    });
  });

  return serializeTicketDetail(ticket);
}

export async function assignTicket(id: string, input: AssignTicketInput, actor: TicketActor) {
  assertDevops(actor, "Only operators and admins can assign tickets.");

  const existingTicket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignee: {
        select: userSelect,
      },
    },
  });

  if (!existingTicket) {
    throw new AppError("Ticket not found.", {
      status: 404,
      code: "TICKET_NOT_FOUND",
    });
  }

  if (existingTicket.assigneeId === input.assigneeId) {
    const currentTicket = await getTicketRecord(id);
    return serializeTicketDetail(currentTicket!);
  }

  let assigneeName = "Unassigned";

  if (input.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: input.assigneeId,
        role: { in: [UserRole.OPERATOR, UserRole.ADMIN] },
      },
      select: userSelect,
    });

    if (!assignee) {
      throw new AppError("Assignee was not found or is not an operator/admin.", {
        status: 404,
        code: "ASSIGNEE_NOT_FOUND",
      });
    }

    assigneeName = assignee.name;
  }

  const ticket = await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id },
      data: {
        assigneeId: input.assigneeId,
      },
      ...ticketDetailArgs,
    });

    await createTicketActivity(tx, {
      ticketId: id,
      actorId: actor.id,
      type: TicketActivityType.ASSIGNED,
      message: input.assigneeId ? `Assigned ticket to ${assigneeName}.` : "Cleared ticket assignee.",
      metadata: {
        assigneeId: input.assigneeId,
      },
    });

    return tx.ticket.findUniqueOrThrow({
      where: { id },
      ...ticketDetailArgs,
    });
  });

  if (input.assigneeId) {
    const ref = formatTicketReference(existingTicket.sequence);
    notifyAssignment(id, ref, input.assigneeId).catch(() => {});
  }

  return serializeTicketDetail(ticket);
}

export async function updateTicketStatus(id: string, input: UpdateTicketStatusInput, actor: TicketActor) {
  assertDevops(actor, "Only operators and admins can change ticket status.");

  const existingTicket = await prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existingTicket) {
    throw new AppError("Ticket not found.", {
      status: 404,
      code: "TICKET_NOT_FOUND",
    });
  }

  if (existingTicket.status === input.status) {
    const currentTicket = await getTicketRecord(id);
    return serializeTicketDetail(currentTicket!);
  }

  // Block status changes while approval is pending
  const pendingApproval = await prisma.approvalRequest.findFirst({
    where: { ticketId: id, status: "PENDING" },
    select: { id: true },
  });

  if (pendingApproval) {
    throw new AppError(
      "This ticket has a pending approval request. Status cannot be changed until the approval is decided.",
      { status: 409, code: "PENDING_APPROVAL" }
    );
  }

  // SLA: track first response, resolution, and close timestamps
  const slaData: Record<string, Date | null> = {};
  if (existingTicket.status === "OPEN" && input.status !== "OPEN") {
    slaData.firstResponseAt = new Date();
  }
  if (input.status === "RESOLVED") {
    slaData.resolvedAt = new Date();
  }
  if (input.status === "CLOSED") {
    slaData.closedAt = new Date();
    if (!slaData.resolvedAt) slaData.resolvedAt = new Date();
  }
  // Reopening: clear resolution/close timestamps
  if (input.status === "OPEN" || input.status === "IN_PROGRESS") {
    slaData.resolvedAt = null;
    slaData.closedAt = null;
  }

  const ticket = await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id },
      data: {
        status: input.status,
        ...slaData,
      },
      ...ticketDetailArgs,
    });

    await createTicketActivity(tx, {
      ticketId: id,
      actorId: actor.id,
      type: TicketActivityType.STATUS_CHANGED,
      message: `Status changed from ${existingTicket.status} to ${input.status}.`,
      metadata: {
        previousStatus: existingTicket.status,
        nextStatus: input.status,
      },
    });

    return tx.ticket.findUniqueOrThrow({
      where: { id },
      ...ticketDetailArgs,
    });
  });

  const ref = formatTicketReference(ticket.sequence);
  notifyStatusChange(id, ref, ticket.requesterId, input.status).catch(() => {});
  emitTrigger("STATUS_CHANGED", id, {
    previousStatus: existingTicket.status,
    newStatus: input.status,
  }).catch(() => {});

  return serializeTicketDetail(ticket);
}
