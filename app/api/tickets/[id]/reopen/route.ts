import { revalidatePath } from "next/cache";
import { TicketActivityType } from "@prisma/client";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { notifyStatusChange } from "@/modules/notifications/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });

    const { id } = await ctx.params;

    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        requesterId: user.id,
        status: { in: ["RESOLVED", "CLOSED"] },
      },
      select: { id: true, sequence: true, status: true, assigneeId: true },
    });

    if (!ticket) {
      return apiError("Ticket not found or cannot be reopened.", { status: 404, code: "NOT_FOUND" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id },
        data: {
          status: "OPEN",
          resolvedAt: null,
          closedAt: null,
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId: id,
          actorId: user.id,
          type: TicketActivityType.STATUS_CHANGED,
          message: `Requester reopened ticket from ${ticket.status}.`,
          metadata: {
            previousStatus: ticket.status,
            nextStatus: "OPEN",
          },
        },
      });
    });

    // Notify assignee if there is one
    if (ticket.assigneeId) {
      const ref = `INF-${ticket.sequence.toString().padStart(4, "0")}`;
      notifyStatusChange(id, ref, ticket.assigneeId, "OPEN").catch(() => {});
    }

    revalidatePath(`/tickets/${id}`);
    return apiSuccess({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
