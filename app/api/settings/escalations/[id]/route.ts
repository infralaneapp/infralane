import { z } from "zod";
import { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";

const escalationStepSchema = z.object({
  delayMinutes: z.number().int().min(0),
  action: z.literal("notify"),
  targetUserId: z.string().min(1),
});

const updateEscalationSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  enabled: z.boolean().optional(),
  steps: z.array(escalationStepSchema).min(1).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const { id } = await params;
    const payload = await parseRequestBody(request, updateEscalationSchema);

    const existing = await prisma.escalationPolicy.findUnique({ where: { id } });
    if (!existing) {
      return apiError("Escalation policy not found.", { status: 404, code: "NOT_FOUND" });
    }

    const updated = await prisma.escalationPolicy.update({
      where: { id },
      data: payload,
    });

    return apiSuccess({ policy: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const { id } = await params;

    const existing = await prisma.escalationPolicy.findUnique({ where: { id } });
    if (!existing) {
      return apiError("Escalation policy not found.", { status: 404, code: "NOT_FOUND" });
    }

    await prisma.escalationPolicy.delete({ where: { id } });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
