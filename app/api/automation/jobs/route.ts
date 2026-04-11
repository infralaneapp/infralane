import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "automation:retry_jobs"))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const ruleId = searchParams.get("ruleId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = 30;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (ruleId) where.ruleId = ruleId;

    const [jobs, total] = await Promise.all([
      prisma.automationJob.findMany({
        where,
        include: {
          rule: { select: { id: true, name: true, action: true } },
          ticket: { select: { id: true, sequence: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.automationJob.count({ where }),
    ]);

    return apiSuccess({
      jobs,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
