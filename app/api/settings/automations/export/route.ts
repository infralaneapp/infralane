import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:automation_rules"))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const [rules, templates] = await Promise.all([
      prisma.automationRule.findMany({
        select: {
          systemKey: true,
          name: true,
          enabled: true,
          trigger: true,
          conditions: true,
          action: true,
          actionValue: true,
          requiresApproval: true,
          builtIn: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.ticketTemplate.findMany({
        select: {
          systemKey: true,
          name: true,
          priority: true,
          title: true,
          body: true,
          fieldValues: true,
          ticketType: { select: { key: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      rules: rules.map((r) => ({ ...r, conditions: r.conditions ?? {} })),
      templates: templates.map((t) => ({
        ...t,
        ticketTypeKey: t.ticketType.key,
        ticketType: undefined,
      })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="infralane-automations-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
