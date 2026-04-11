import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "automation:retry_jobs"))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const { jobId } = await context.params;

    const job = await prisma.automationJob.findUnique({ where: { id: jobId } });

    if (!job) {
      return apiError("Job not found.", { status: 404, code: "JOB_NOT_FOUND" });
    }

    if (job.status !== "FAILED" && job.status !== "DEAD_LETTER") {
      return apiError("Only FAILED or DEAD_LETTER jobs can be retried.", {
        status: 400,
        code: "INVALID_JOB_STATUS",
      });
    }

    const updated = await prisma.automationJob.update({
      where: { id: jobId },
      data: {
        status: "QUEUED",
        error: null,
        attempts: 0,
        deadLetter: false,
        nextRunAt: null,
        completedAt: null,
      },
    });

    await prisma.automationJobEvent.create({
      data: {
        jobId,
        event: "QUEUED",
        detail: `Manually retried (was ${job.status})`,
      },
    });

    return apiSuccess({ job: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
