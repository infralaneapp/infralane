import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";
import { logSettingsChange } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:automation_rules")) return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    const rules = await prisma.automationRule.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { jobs: true } },
        jobs: {
          select: { status: true },
        },
      },
    });

    const rulesWithCounts = rules.map(({ jobs, ...rule }) => ({
      ...rule,
      jobCounts: {
        total: jobs.length,
        succeeded: jobs.filter((j) => j.status === "SUCCEEDED").length,
        failed: jobs.filter((j) => j.status === "FAILED").length,
      },
    }));
    return apiSuccess({ rules: rulesWithCounts });
  } catch (error) {
    return handleApiError(error);
  }
}

const createRuleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  trigger: z.enum(["TICKET_CREATED", "STATUS_CHANGED", "SLA_BREACHED", "PRIORITY_CHANGED", "STALE_WAITING", "RESOLVED_EXPIRED"]),
  conditions: z.record(z.string()).default({}),
  action: z.enum(["ASSIGN_TO", "CHANGE_STATUS", "CHANGE_PRIORITY", "ADD_TAG", "NOTIFY", "SLACK_NOTIFY", "WEBHOOK"]),
  actionValue: z.string().trim().min(1),
  enabled: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:automation_rules")) return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    const payload = await parseRequestBody(req, createRuleSchema);
    const rule = await prisma.automationRule.create({ data: payload });
    logSettingsChange(user.id, "create", "automation_rule", rule.id, rule.name).catch(() => {});
    return apiSuccess({ rule }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
