import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";
import { maskHeaders } from "@/lib/secrets";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const webhooks = await prisma.webhookEndpoint.findMany({
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess({
      webhooks: webhooks.map((w) => ({
        ...w,
        headers: maskHeaders(w.headers as Record<string, string>),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const createWebhookSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().url(),
  method: z.string().default("POST"),
  headers: z.record(z.string()).default({}),
  payloadTemplate: z.string().optional(),
  allowedDomains: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const payload = await parseRequestBody(request, createWebhookSchema);
    const webhook = await prisma.webhookEndpoint.create({ data: payload });
    return apiSuccess({ webhook }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
