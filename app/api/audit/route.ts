import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "audit:view")) return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));

    const where = type ? { type: type as any } : {};

    const [activities, total] = await Promise.all([
      prisma.ticketActivity.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, email: true } },
          ticket: { select: { id: true, sequence: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * 30,
        take: 30,
      }),
      prisma.ticketActivity.count({ where }),
    ]);

    const items = activities.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      createdAt: a.createdAt.toISOString(),
      actor: a.actor ? { name: a.actor.name, email: a.actor.email } : null,
      ticket: a.ticket ? {
        id: a.ticket.id,
        reference: `INF-${a.ticket.sequence.toString().padStart(4, "0")}`,
        title: a.ticket.title,
      } : null,
    }));

    return apiSuccess({ activities: items, total, page, totalPages: Math.ceil(total / 30) });
  } catch (error) {
    return handleApiError(error);
  }
}
