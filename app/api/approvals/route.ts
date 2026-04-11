import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { hasPermission } from "@/lib/auth/permissions";
import { listApprovalRequests, getPendingCount } from "@/modules/approvals/service";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "approvals:decide"))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;

    const [approvals, pendingCount] = await Promise.all([
      listApprovalRequests({ status }, { id: user.id, role: user.role }),
      getPendingCount(),
    ]);

    return apiSuccess({ approvals, pendingCount });
  } catch (error) {
    return handleApiError(error);
  }
}
