import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";

const escalationStepSchema = z.object({
  delayMinutes: z.number().int().min(0),
  action: z.literal("notify"),
  targetUserId: z.string().min(1),
});

const createEscalationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  enabled: z.boolean().default(true),
  steps: z.array(escalationStepSchema).min(1),
});

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const policies = await prisma.escalationPolicy.findMany({
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({ policies });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const payload = await parseRequestBody(request, createEscalationSchema);

    const policy = await prisma.escalationPolicy.create({
      data: {
        name: payload.name,
        enabled: payload.enabled,
        steps: payload.steps,
      },
    });

    return apiSuccess({ policy }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
