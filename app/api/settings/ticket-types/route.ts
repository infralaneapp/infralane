import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { listTicketTypesAdmin, createTicketType } from "@/modules/settings/ticket-types";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/permissions";

const createSchema = z.object({
  key: z.string().trim().min(1).max(40).regex(/^[a-z0-9_]+$/, "Key must be lowercase alphanumeric with underscores"),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  fieldSchema: z.array(z.object({
    key: z.string(),
    label: z.string(),
    required: z.boolean().optional(),
    type: z.enum(["text", "textarea", "select"]).optional(),
    options: z.array(z.string()).optional(),
    placeholder: z.string().optional(),
    description: z.string().optional(),
  })).default([]),
});

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }
    const types = await listTicketTypesAdmin();
    return apiSuccess({ ticketTypes: types });
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
    const payload = await parseRequestBody(request, createSchema);
    const ticketType = await createTicketType(payload);
    return apiSuccess({ ticketType }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
