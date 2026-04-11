import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/auth/permissions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user || !isStaffRole(user.role))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const { id } = await context.params;

    const jobs = await prisma.automationJob.findMany({
      where: { ruleId: id },
      include: {
        ticket: { select: { id: true, sequence: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return apiSuccess({ jobs });
  } catch (error) {
    return handleApiError(error);
  }
}
