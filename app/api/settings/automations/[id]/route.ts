import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";
import { logSettingsChange } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  trigger: z.enum(["TICKET_CREATED", "STATUS_CHANGED", "SLA_BREACHED", "PRIORITY_CHANGED", "STALE_WAITING", "RESOLVED_EXPIRED"]).optional(),
  conditions: z.record(z.string()).optional(),
  action: z.enum(["ASSIGN_TO", "CHANGE_STATUS", "CHANGE_PRIORITY", "ADD_TAG", "NOTIFY", "SLACK_NOTIFY", "WEBHOOK"]).optional(),
  actionValue: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:automation_rules")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }
    const { id } = await context.params;
    const payload = await parseRequestBody(request, updateSchema);
    const rule = await prisma.automationRule.update({
      where: { id },
      data: payload,
    });
    logSettingsChange(user.id, "update", "automation_rule", rule.id, rule.name).catch(() => {});
    return apiSuccess({ rule });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:automation_rules")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }
    const { id } = await context.params;
    const rule = await prisma.automationRule.findUnique({ where: { id }, select: { builtIn: true } });
    if (rule?.builtIn) {
      return apiError("Built-in rules cannot be deleted.", { status: 400, code: "BUILT_IN_RULE" });
    }
    await prisma.automationRule.delete({ where: { id } });
    logSettingsChange(user.id, "delete", "automation_rule", id).catch(() => {});
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
