import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";
import { logSettingsChange } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const members = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        slackUserId: true,
        createdAt: true,
        _count: { select: { assignedTickets: true, requestedTickets: true } },
      },
      orderBy: { name: "asc" },
    });
    return apiSuccess({ members });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateMemberSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["REQUESTER", "OPERATOR", "ADMIN"]).optional(),
  slackUserId: z.string().trim().max(50).nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const { userId, role, slackUserId } = await parseRequestBody(request, updateMemberSchema);

    if (role && userId === user.id) {
      return apiError("Cannot change your own role.", { status: 400, code: "SELF_ROLE_CHANGE" });
    }

    const data: Record<string, unknown> = {};
    if (role !== undefined) data.role = role;
    if (slackUserId !== undefined) data.slackUserId = slackUserId;

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, role: true, slackUserId: true },
    });
    if (role) {
      logSettingsChange(user.id, "update", "team_member", userId, `Role changed to ${role}`).catch(() => {});
    }
    return apiSuccess({ member: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
