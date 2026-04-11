import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { DEFAULT_SLA_THRESHOLDS, invalidateSlaCache } from "@/lib/sla";
import { logSettingsChange } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage"))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const config = await prisma.integrationConfig.findUnique({
      where: { provider: "sla_thresholds" },
    });

    const thresholds = config?.config ?? DEFAULT_SLA_THRESHOLDS;

    return apiSuccess({ thresholds, isDefault: !config });
  } catch (error) {
    return handleApiError(error);
  }
}

const thresholdSchema = z.object({
  responseHours: z.number().min(0.1).max(8760),
  resolutionHours: z.number().min(0.1).max(8760),
});

const saveSchema = z.object({
  URGENT: thresholdSchema,
  HIGH: thresholdSchema,
  MEDIUM: thresholdSchema,
  LOW: thresholdSchema,
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage"))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const body = await parseRequestBody(request, saveSchema);

    await prisma.integrationConfig.upsert({
      where: { provider: "sla_thresholds" },
      update: { config: body as any, enabled: true },
      create: { provider: "sla_thresholds", config: body as any, enabled: true },
    });

    invalidateSlaCache();
    logSettingsChange(user.id, "update", "sla_thresholds", undefined, JSON.stringify(body)).catch(() => {});

    return apiSuccess({ thresholds: body });
  } catch (error) {
    return handleApiError(error);
  }
}
