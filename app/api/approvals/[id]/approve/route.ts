import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, type RouteContext } from "@/lib/http";
import { hasPermission } from "@/lib/auth/permissions";
import { approveRequest } from "@/modules/approvals/service";

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "approvals:decide"))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const { id } = await context.params;
    await approveRequest(id, { id: user.id, role: user.role });

    return apiSuccess({ approved: true });
  } catch (error) {
    return handleApiError(error);
  }
}
