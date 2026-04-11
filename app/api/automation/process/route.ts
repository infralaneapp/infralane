import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { processJobs } from "@/modules/automation/worker";

export async function POST(request: Request) {
  try {
    const secret = process.env.AUTOMATION_WORKER_SECRET;
    if (!secret) {
      return apiError("Worker endpoint not configured.", { status: 503, code: "NOT_CONFIGURED" });
    }

    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return apiError("Invalid secret.", { status: 401, code: "UNAUTHORIZED" });
    }

    await processJobs();

    return apiSuccess({ processed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
