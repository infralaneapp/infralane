import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { isStaffRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { evaluateConditions, type TicketSnapshot } from "@/modules/automation/conditions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user || !isStaffRole(user.role))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const { id } = await context.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        ticketType: { select: { key: true } },
        tags: { include: { tag: { select: { name: true } } } },
        fields: { select: { key: true, value: true } },
      },
    });

    if (!ticket) {
      return apiError("Ticket not found.", { status: 404, code: "NOT_FOUND" });
    }

    const snapshot: TicketSnapshot = {
      priority: ticket.priority,
      status: ticket.status,
      assigneeId: ticket.assigneeId,
      ticketType: ticket.ticketType,
      tags: ticket.tags,
      fields: ticket.fields,
    };

    const rules = await prisma.automationRule.findMany({
      where: { enabled: true },
      select: { id: true, name: true, trigger: true, conditions: true, action: true },
    });

    const trace = rules.map((rule) => {
      const conditions = (rule.conditions as Record<string, string>) ?? {};
      const conditionKeys = Object.keys(conditions);

      // Evaluate each condition individually to find which one failed
      const conditionResults = conditionKeys.map((key) => {
        const singleCondition = { [key]: conditions[key] };
        const passed = evaluateConditions(singleCondition, snapshot);
        return { key, value: conditions[key], passed };
      });

      const allMatch = conditionKeys.length === 0 || conditionResults.every((c) => c.passed);

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        trigger: rule.trigger,
        action: rule.action,
        matched: allMatch,
        conditionResults,
      };
    });

    return apiSuccess({ trace });
  } catch (error) {
    return handleApiError(error);
  }
}
