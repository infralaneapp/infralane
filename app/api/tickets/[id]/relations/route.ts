import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { assertTicketAccess } from "@/modules/tickets/service";

type RouteContext = { params: Promise<{ id: string }> };

const createRelationSchema = z.object({
  toTicketId: z.string().cuid(),
  type: z.enum(["RELATED", "BLOCKS", "DUPLICATE"]).default("RELATED"),
});

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });
    const { id } = await ctx.params;
    await assertTicketAccess(id, user);

    const [from, to] = await Promise.all([
      prisma.ticketRelation.findMany({
        where: { fromTicketId: id },
        include: { toTicket: { select: { id: true, sequence: true, title: true, status: true } } },
      }),
      prisma.ticketRelation.findMany({
        where: { toTicketId: id },
        include: { fromTicket: { select: { id: true, sequence: true, title: true, status: true } } },
      }),
    ]);

    const relations = [
      ...from.map((r) => ({
        id: r.id,
        type: r.type,
        direction: "outgoing" as const,
        ticket: { ...r.toTicket, reference: `INF-${r.toTicket.sequence.toString().padStart(4, "0")}` },
      })),
      ...to.map((r) => ({
        id: r.id,
        type: r.type,
        direction: "incoming" as const,
        ticket: { ...r.fromTicket, reference: `INF-${r.fromTicket.sequence.toString().padStart(4, "0")}` },
      })),
    ];

    return apiSuccess({ relations });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });
    const { id } = await ctx.params;
    await assertTicketAccess(id, user);
    const payload = await parseRequestBody(req, createRelationSchema);

    if (payload.toTicketId === id) {
      return apiError("Cannot relate a ticket to itself.", { status: 400, code: "SELF_RELATION" });
    }

    const relation = await prisma.ticketRelation.create({
      data: { fromTicketId: id, toTicketId: payload.toTicketId, type: payload.type },
    });

    revalidatePath(`/tickets/${id}`);
    return apiSuccess({ relation }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
