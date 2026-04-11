import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { assertTicketAccess } from "@/modules/tickets/service";

type RouteContext = { params: Promise<{ id: string }> };

const tagSchema = z.object({ tagId: z.string().cuid() });

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });
    const { id } = await ctx.params;
    await assertTicketAccess(id, user);
    const { tagId } = await parseRequestBody(req, tagSchema);

    await prisma.ticketTag.upsert({
      where: { ticketId_tagId: { ticketId: id, tagId } },
      create: { ticketId: id, tagId },
      update: {},
    });

    revalidatePath(`/tickets/${id}`);
    return apiSuccess({ added: true }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });
    const { id } = await ctx.params;
    await assertTicketAccess(id, user);
    const { tagId } = await parseRequestBody(req, tagSchema);

    await prisma.ticketTag.deleteMany({ where: { ticketId: id, tagId } });

    revalidatePath(`/tickets/${id}`);
    return apiSuccess({ removed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
