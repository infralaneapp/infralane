export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Validate environment variables at server startup
    const { validateEnv } = await import("@/lib/env");
    validateEnv();

    if (process.env.INFRALANE_WORKER_MODE !== "external") {
      const { startAutomationWorker } = await import("@/modules/automation/worker");
      startAutomationWorker();
    }
  }
}
