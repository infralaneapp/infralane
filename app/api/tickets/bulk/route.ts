import { revalidatePath } from "next/cache";
import { TicketActivityType } from "@prisma/client";
import { z } from "zod";
import { isStaffRole } from "@/lib/auth/permissions";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { TICKET_STATUS_VALUES } from "@/modules/tickets/constants";

const bulkSchema = z.object({
  ticketIds: z.array(z.string().cuid()).min(1).max(50),
  action: z.enum(["assign", "close"]),
  assigneeId: z.string().cuid().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !isStaffRole(user.role)) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const { ticketIds, action, assigneeId } = await parseRequestBody(request, bulkSchema);

    if (action === "assign") {
      if (!assigneeId) return apiError("assigneeId required for assign action.", { status: 400, code: "MISSING_ASSIGNEE" });

      await prisma.$transaction(async (tx) => {
        await tx.ticket.updateMany({
          where: { id: { in: ticketIds } },
          data: { assigneeId },
        });
        await tx.ticketActivity.createMany({
          data: ticketIds.map((ticketId) => ({
            ticketId,
            actorId: user.id,
            type: TicketActivityType.ASSIGNED,
            message: "Bulk assigned.",
          })),
        });
      });
    }

    if (action === "close") {
      await prisma.$transaction(async (tx) => {
        await tx.ticket.updateMany({
          where: { id: { in: ticketIds } },
          data: { status: "CLOSED" },
        });
        await tx.ticketActivity.createMany({
          data: ticketIds.map((ticketId) => ({
            ticketId,
            actorId: user.id,
            type: TicketActivityType.STATUS_CHANGED,
            message: "Bulk closed.",
          })),
        });
      });
    }

    revalidatePath("/tickets");
    return apiSuccess({ updated: ticketIds.length });
  } catch (error) {
    return handleApiError(error);
  }
}
