import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody, type RouteContext } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";

const updateWebhookSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  url: z.string().url().optional(),
  method: z.string().optional(),
  headers: z.record(z.string()).optional(),
  payloadTemplate: z.string().nullable().optional(),
  allowedDomains: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }
    const { id } = await context.params;
    const payload = await parseRequestBody(request, updateWebhookSchema);
    const webhook = await prisma.webhookEndpoint.update({
      where: { id },
      data: payload,
    });
    return apiSuccess({ webhook });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }
    const { id } = await context.params;
    await prisma.webhookEndpoint.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
