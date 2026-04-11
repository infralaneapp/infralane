import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        slackUserId: true,
        createdAt: true,
        _count: { select: { requestedTickets: true, assignedTickets: true } },
      },
    });

    return apiSuccess({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  onboarded: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });

    const payload = await parseRequestBody(req, updateProfileSchema);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: payload,
      select: { id: true, email: true, name: true, role: true, onboarded: true },
    });

    return apiSuccess({ user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
