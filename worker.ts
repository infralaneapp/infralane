/**
 * Standalone automation worker process.
 * Run via: npx tsx worker.ts
 *
 * This is the production-grade way to run the automation worker
 * outside of the Next.js web process.
 */

import { PrismaClient } from "@prisma/client";

const POLL_INTERVAL = 5000;
const SLA_CHECK_INTERVAL = 60000;

let running = true;

async function main() {
  // Ensure DB is reachable before starting loops
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log("[worker] Connected to database");
  await prisma.$disconnect();

  // Dynamic imports to use the same modules as the app
  const { processJobs } = await import("./modules/automation/worker");
  const { checkSlaBreaches } = await import("./modules/automation/sla-checker");

  console.log("[worker] Starting automation worker (poll: %dms, SLA: %dms)", POLL_INTERVAL, SLA_CHECK_INTERVAL);

  const jobInterval = setInterval(async () => {
    if (!running) return;
    try {
      const count = await processJobs();
      if (count > 0) {
        console.log("[worker] Processed %d jobs", count);
      }
    } catch (error) {
      console.error("[worker] Job processing error:", error);
    }
  }, POLL_INTERVAL);

  const slaInterval = setInterval(async () => {
    if (!running) return;
    try {
      const count = await checkSlaBreaches();
      if (count > 0) {
        console.log("[worker] Emitted %d SLA breach triggers", count);
      }
    } catch (error) {
      console.error("[worker] SLA check error:", error);
    }
  }, SLA_CHECK_INTERVAL);

  function shutdown(signal: string) {
    console.log("[worker] Received %s, shutting down...", signal);
    running = false;
    clearInterval(jobInterval);
    clearInterval(slaInterval);
    // Give in-flight jobs time to finish
    setTimeout(() => {
      console.log("[worker] Stopped");
      process.exit(0);
    }, 2000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
