import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { logSettingsChange } from "@/lib/audit";
import { maskConfigSecrets } from "@/lib/secrets";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage"))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (provider) {
      const integration = await prisma.integrationConfig.findUnique({
        where: { provider },
      });
      if (integration) {
        return apiSuccess({
          integration: {
            ...integration,
            config: maskConfigSecrets(integration.config as Record<string, unknown>),
          },
        });
      }
      return apiSuccess({ integration: null });
    }

    const integrations = await prisma.integrationConfig.findMany();
    return apiSuccess({
      integrations: integrations.map((i) => ({
        ...i,
        config: maskConfigSecrets(i.config as Record<string, unknown>),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const upsertSchema = z.object({
  provider: z.string().min(1),
  config: z.record(z.unknown()),
  enabled: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage"))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const body = await parseRequestBody(request, upsertSchema);

    // Merge with existing config — preserve secret fields if the client sends masked values (****...)
    const existing = await prisma.integrationConfig.findUnique({ where: { provider: body.provider } });
    const existingConfig = (existing?.config as Record<string, unknown>) ?? {};
    const newConfig = body.config as Record<string, unknown>;

    // If a value starts with "****", keep the existing value (it was masked in the GET response)
    const mergedConfig: Record<string, unknown> = { ...newConfig };
    for (const [key, value] of Object.entries(newConfig)) {
      if (typeof value === "string" && value.startsWith("****") && existingConfig[key]) {
        mergedConfig[key] = existingConfig[key];
      }
    }

    const integration = await prisma.integrationConfig.upsert({
      where: { provider: body.provider },
      update: { config: mergedConfig as any, enabled: body.enabled },
      create: { provider: body.provider, config: mergedConfig as any, enabled: body.enabled },
    });

    logSettingsChange(user.id, "upsert", "integration", integration.id, body.provider).catch(() => {});

    return apiSuccess({
      integration: {
        ...integration,
        config: maskConfigSecrets(integration.config as Record<string, unknown>),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
