import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { isStaffRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !isStaffRole(user.role))
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Job status summary
    const jobCounts = await prisma.automationJob.groupBy({
      by: ["status"],
      _count: true,
    });

    const summary = {
      totalJobs: 0,
      succeeded: 0,
      failed: 0,
      deadLettered: 0,
      queued: 0,
      pendingApproval: 0,
    };

    for (const row of jobCounts) {
      summary.totalJobs += row._count;
      if (row.status === "SUCCEEDED") summary.succeeded = row._count;
      if (row.status === "FAILED") summary.failed = row._count;
      if (row.status === "DEAD_LETTER") summary.deadLettered = row._count;
      if (row.status === "QUEUED") summary.queued = row._count;
      if (row.status === "PENDING_APPROVAL") summary.pendingApproval = row._count;
    }

    // Per-rule stats from evaluations
    const ruleStats = await prisma.automationRuleEvaluation.groupBy({
      by: ["ruleId"],
      _count: true,
      where: { createdAt: { gte: oneDayAgo } },
    });

    const ruleMatchStats = await prisma.automationRuleEvaluation.groupBy({
      by: ["ruleId"],
      _count: true,
      where: { matched: true, createdAt: { gte: oneDayAgo } },
    });

    const ruleDedupStats = await prisma.automationRuleEvaluation.groupBy({
      by: ["ruleId"],
      _count: true,
      where: { dedupSkipped: true, createdAt: { gte: oneDayAgo } },
    });

    const rules = await prisma.automationRule.findMany({
      select: { id: true, name: true },
    });

    const ruleMap = Object.fromEntries(rules.map((r) => [r.id, r.name]));
    const matchMap = Object.fromEntries(ruleMatchStats.map((r) => [r.ruleId, r._count]));
    const dedupMap = Object.fromEntries(ruleDedupStats.map((r) => [r.ruleId, r._count]));

    const perRuleStats = ruleStats.map((r) => ({
      ruleId: r.ruleId,
      ruleName: ruleMap[r.ruleId] ?? "Unknown",
      evaluated: r._count,
      matched: matchMap[r.ruleId] ?? 0,
      dedupSkipped: dedupMap[r.ruleId] ?? 0,
    }));

    // Recent failures
    const recentFailures = await prisma.automationJob.findMany({
      where: { status: { in: ["FAILED", "DEAD_LETTER"] }, createdAt: { gte: oneDayAgo } },
      include: {
        rule: { select: { name: true } },
        ticket: { select: { sequence: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Queue health
    const oldestQueued = await prisma.automationJob.findFirst({
      where: { status: "QUEUED" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    return apiSuccess({
      summary,
      perRuleStats,
      recentFailures,
      queueDepth: summary.queued,
      oldestQueuedAt: oldestQueued?.createdAt ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
