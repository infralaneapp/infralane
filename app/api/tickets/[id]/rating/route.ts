import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/auth/permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });

    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { requesterId: true },
    });

    if (!ticket) return apiError("Ticket not found.", { status: 404, code: "NOT_FOUND" });

    // Only the requester or staff can view ratings
    if (ticket.requesterId !== user.id && !isStaffRole(user.role)) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const rating = await prisma.ticketRating.findUnique({
      where: { ticketId: id },
    });

    return apiSuccess({ rating });
  } catch (error) {
    return handleApiError(error);
  }
}

const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });

    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { requesterId: true, status: true },
    });

    if (!ticket) return apiError("Ticket not found.", { status: 404, code: "NOT_FOUND" });

    // Only the ticket requester can rate
    if (ticket.requesterId !== user.id) {
      return apiError("Only the ticket requester can submit a rating.", { status: 403, code: "FORBIDDEN" });
    }

    // Must be resolved or closed
    if (ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") {
      return apiError("Ticket must be resolved or closed to rate.", { status: 400, code: "INVALID_STATUS" });
    }

    const payload = await parseRequestBody(req, ratingSchema);

    const rating = await prisma.ticketRating.upsert({
      where: { ticketId: id },
      create: {
        ticketId: id,
        userId: user.id,
        rating: payload.rating,
        comment: payload.comment ?? null,
      },
      update: {
        rating: payload.rating,
        comment: payload.comment ?? null,
      },
    });

    return apiSuccess({ rating });
  } catch (error) {
    return handleApiError(error);
  }
}
