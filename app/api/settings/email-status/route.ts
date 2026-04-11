import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { hasPermission } from "@/lib/auth/permissions";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const configured = !!process.env.SMTP_HOST;

    return apiSuccess({ configured });
  } catch (error) {
    return handleApiError(error);
  }
}
