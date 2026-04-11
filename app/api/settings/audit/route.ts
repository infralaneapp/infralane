import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const entity = searchParams.get("entity");
    const perPage = 50;

    const where = entity ? { entity } : {};

    const [logs, total] = await Promise.all([
      prisma.settingsAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.settingsAuditLog.count({ where }),
    ]);

    return apiSuccess({ logs, total, page, perPage });
  } catch (error) {
    return handleApiError(error);
  }
}
