import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { hasPermission } from "@/lib/auth/permissions";
import { rejectRequest } from "@/modules/approvals/service";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "approvals:decide"))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const { id } = await context.params;
    const body = await parseRequestBody(request, rejectSchema);
    await rejectRequest(id, { id: user.id, role: user.role }, body.reason);

    return apiSuccess({ rejected: true });
  } catch (error) {
    return handleApiError(error);
  }
}
