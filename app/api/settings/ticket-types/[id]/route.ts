import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { updateTicketType, deleteTicketType } from "@/modules/settings/ticket-types";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/permissions";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  archived: z.boolean().optional(),
  fieldSchema: z.array(z.object({
    key: z.string(),
    label: z.string(),
    required: z.boolean().optional(),
    type: z.enum(["text", "textarea", "select"]).optional(),
    options: z.array(z.string()).optional(),
    placeholder: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }
    const { id } = await context.params;
    const payload = await parseRequestBody(request, updateSchema);
    const ticketType = await updateTicketType(id, payload);
    return apiSuccess({ ticketType });
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
    await deleteTicketType(id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
