import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { logSettingsChange } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:automation_rules"))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const body = await request.json();

    if (!body || body.version !== 1) {
      return apiError("Invalid import format. Expected version 1.", {
        status: 400,
        code: "INVALID_FORMAT",
      });
    }

    let rulesImported = 0;
    let templatesImported = 0;
    const errors: string[] = [];

    // Import rules
    if (Array.isArray(body.rules)) {
      for (const rule of body.rules) {
        try {
          if (!rule.name || !rule.trigger || !rule.action || !rule.actionValue) {
            errors.push(`Rule "${rule.name ?? "unnamed"}": missing required fields`);
            continue;
          }

          if (rule.systemKey) {
            // Upsert by systemKey (for built-in rules)
            await prisma.automationRule.upsert({
              where: { systemKey: rule.systemKey },
              update: {
                name: rule.name,
                enabled: rule.enabled ?? true,
                trigger: rule.trigger,
                conditions: rule.conditions ?? {},
                action: rule.action,
                actionValue: rule.actionValue,
                requiresApproval: rule.requiresApproval ?? false,
              },
              create: {
                systemKey: rule.systemKey,
                name: rule.name,
                builtIn: rule.builtIn ?? false,
                enabled: rule.enabled ?? true,
                trigger: rule.trigger,
                conditions: rule.conditions ?? {},
                action: rule.action,
                actionValue: rule.actionValue,
                requiresApproval: rule.requiresApproval ?? false,
              },
            });
          } else {
            // Create new rule (no systemKey = user-created)
            await prisma.automationRule.create({
              data: {
                name: rule.name,
                enabled: rule.enabled ?? true,
                trigger: rule.trigger,
                conditions: rule.conditions ?? {},
                action: rule.action,
                actionValue: rule.actionValue,
                requiresApproval: rule.requiresApproval ?? false,
              },
            });
          }
          rulesImported++;
        } catch (err: any) {
          errors.push(`Rule "${rule.name}": ${err.message ?? "unknown error"}`);
        }
      }
    }

    // Import templates
    if (Array.isArray(body.templates)) {
      for (const tpl of body.templates) {
        try {
          if (!tpl.name || !tpl.ticketTypeKey) {
            errors.push(`Template "${tpl.name ?? "unnamed"}": missing required fields`);
            continue;
          }

          const ticketType = await prisma.ticketType.findUnique({
            where: { key: tpl.ticketTypeKey },
            select: { id: true },
          });

          if (!ticketType) {
            errors.push(`Template "${tpl.name}": ticket type "${tpl.ticketTypeKey}" not found`);
            continue;
          }

          if (tpl.systemKey) {
            await prisma.ticketTemplate.upsert({
              where: { systemKey: tpl.systemKey },
              update: { name: tpl.name },
              create: {
                systemKey: tpl.systemKey,
                name: tpl.name,
                ticketTypeId: ticketType.id,
                priority: tpl.priority ?? "MEDIUM",
                title: tpl.title ?? null,
                body: tpl.body ?? null,
                fieldValues: tpl.fieldValues ?? {},
              },
            });
          } else {
            await prisma.ticketTemplate.create({
              data: {
                name: tpl.name,
                ticketTypeId: ticketType.id,
                priority: tpl.priority ?? "MEDIUM",
                title: tpl.title ?? null,
                body: tpl.body ?? null,
                fieldValues: tpl.fieldValues ?? {},
              },
            });
          }
          templatesImported++;
        } catch (err: any) {
          errors.push(`Template "${tpl.name}": ${err.message ?? "unknown error"}`);
        }
      }
    }

    logSettingsChange(
      user.id,
      "import",
      "automations",
      undefined,
      `Imported ${rulesImported} rules, ${templatesImported} templates`
    ).catch(() => {});

    return apiSuccess({ rulesImported, templatesImported, errors });
  } catch (error) {
    return handleApiError(error);
  }
}
