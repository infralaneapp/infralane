import { prisma } from "@/lib/db";
import { executeAction } from "@/modules/automation/executors";
import { computeNextRunAt } from "@/modules/automation/backoff";

const POLL_INTERVAL = 5000; // 5 seconds
const BATCH_SIZE = 10;

type ClaimedJob = {
  id: string;
  ruleId: string;
  ticketId: string;
  trigger: string;
  status: string;
  actionPayload: unknown;
  attempts: number;
  maxAttempts: number;
};

type WorkerState = {
  jobInterval: ReturnType<typeof setInterval> | null;
  slaInterval: ReturnType<typeof setInterval> | null;
};

const globalForWorker = globalThis as unknown as { automationWorker?: WorkerState };

/**
 * Log a lifecycle event for a job.
 */
async function logJobEvent(jobId: string, event: string, detail?: string): Promise<void> {
  await prisma.automationJobEvent.create({
    data: { jobId, event, detail },
  });
}

/**
 * Atomically claim a batch of QUEUED jobs ready for execution.
 * Uses UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING *
 * to prevent double-claim races.
 */
async function claimJobs(): Promise<ClaimedJob[]> {
  return prisma.$queryRaw<ClaimedJob[]>`
    UPDATE "automation_jobs"
    SET "status" = 'RUNNING',
        "attempts" = "attempts" + 1,
        "startedAt" = NOW(),
        "lastAttemptAt" = NOW()
    WHERE id IN (
      SELECT id FROM "automation_jobs"
      WHERE "status" = 'QUEUED'
        AND ("nextRunAt" IS NULL OR "nextRunAt" <= NOW())
      ORDER BY "createdAt" ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "ruleId", "ticketId", trigger,
              status, "actionPayload", attempts, "maxAttempts"
  `;
}

/**
 * Process a batch of QUEUED automation jobs.
 */
export async function processJobs(): Promise<number> {
  const jobs = await claimJobs();

  if (jobs.length === 0) return 0;

  let processed = 0;

  for (const job of jobs) {
    await logJobEvent(job.id, "RUNNING", `Attempt ${job.attempts}`);

    try {
      const payload = job.actionPayload as {
        action: string;
        actionValue: string;
        ruleName: string;
      };

      const result = await executeAction(payload.action, {
        ticketId: job.ticketId,
        actionValue: payload.actionValue,
        ruleId: job.ruleId,
        ruleName: payload.ruleName,
      });

      if (result.success) {
        await prisma.automationJob.update({
          where: { id: job.id },
          data: {
            status: "SUCCEEDED",
            result: result as any,
            completedAt: new Date(),
          },
        });
        await logJobEvent(job.id, "SUCCEEDED", result.detail);
      } else {
        throw new Error(result.detail ?? "Action returned failure");
      }

      processed++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        const nextRunAt = computeNextRunAt(job.attempts);
        await prisma.automationJob.update({
          where: { id: job.id },
          data: {
            status: "QUEUED",
            error: errorMsg,
            nextRunAt,
          },
        });
        await logJobEvent(
          job.id,
          "RETRYING",
          `Attempt ${job.attempts}/${job.maxAttempts} failed: ${errorMsg}. Next retry at ${nextRunAt.toISOString()}`
        );
      } else {
        // Exhausted retries → dead letter
        await prisma.automationJob.update({
          where: { id: job.id },
          data: {
            status: "DEAD_LETTER",
            error: errorMsg,
            deadLetter: true,
            completedAt: new Date(),
          },
        });
        await logJobEvent(
          job.id,
          "DEAD_LETTERED",
          `All ${job.maxAttempts} attempts exhausted. Last error: ${errorMsg}`
        );
      }
    }
  }

  return processed;
}

/**
 * Start the automation worker polling loop.
 * Uses globalThis singleton to prevent duplicates during hot-reload.
 */
export function startAutomationWorker(): void {
  if (globalForWorker.automationWorker?.jobInterval) {
    clearInterval(globalForWorker.automationWorker.jobInterval);
  }
  if (globalForWorker.automationWorker?.slaInterval) {
    clearInterval(globalForWorker.automationWorker.slaInterval);
  }

  const jobInterval = setInterval(async () => {
    try {
      await processJobs();
    } catch (error) {
      console.error("[automation-worker] Job processing error:", error);
    }
  }, POLL_INTERVAL);

  let slaInterval: ReturnType<typeof setInterval> | null = null;

  Promise.all([
    import("@/modules/automation/sla-checker"),
    import("@/modules/approvals/service"),
  ]).then(([{ checkSlaBreaches }, { expireStaleApprovals }]) => {
    slaInterval = setInterval(async () => {
      try {
        await checkSlaBreaches();
        await expireStaleApprovals();
      } catch (error) {
        console.error("[automation-worker] SLA/approval check error:", error);
      }
    }, 60000);

    if (globalForWorker.automationWorker) {
      globalForWorker.automationWorker.slaInterval = slaInterval;
    }
  }).catch(() => {
    // Modules not available yet during build
  });

  globalForWorker.automationWorker = { jobInterval, slaInterval };

  console.log("[automation-worker] Started (poll: 5s, SLA check: 60s)");
}

export function stopAutomationWorker(): void {
  if (globalForWorker.automationWorker?.jobInterval) {
    clearInterval(globalForWorker.automationWorker.jobInterval);
  }
  if (globalForWorker.automationWorker?.slaInterval) {
    clearInterval(globalForWorker.automationWorker.slaInterval);
  }
  globalForWorker.automationWorker = { jobInterval: null, slaInterval: null };
  console.log("[automation-worker] Stopped");
}
