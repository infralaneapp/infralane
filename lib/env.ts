const OPTIONAL_FEATURE_VARS = [
  "SLACK_CLIENT_ID",
  "SMTP_HOST",
  "AUTOMATION_WORKER_SECRET",
] as const;

export function validateEnv(): void {
  const errors: string[] = [];

  // DATABASE_URL is always required
  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required but not set.");
  }

  // In production, INFRALANE_SESSION_SECRET must be set and >= 32 chars
  if (process.env.NODE_ENV === "production") {
    const secret = process.env.INFRALANE_SESSION_SECRET;
    if (!secret) {
      errors.push("INFRALANE_SESSION_SECRET is required in production.");
    } else if (secret.length < 32) {
      errors.push(
        `INFRALANE_SESSION_SECRET must be at least 32 characters (got ${secret.length}).`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n  - ${errors.join("\n  - ")}`
    );
  }

  // Warn about optional vars that affect functionality
  for (const key of OPTIONAL_FEATURE_VARS) {
    if (!process.env[key]) {
      console.warn(
        `[env] Optional variable ${key} is not set — related functionality will be disabled.`
      );
    }
  }
}

// Run validation only at actual runtime, not during build/compile
// instrumentation.ts imports this module at server startup to trigger validation
// Don't auto-validate on import — let instrumentation.ts call validateEnv() explicitly

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  NODE_ENV: process.env.NODE_ENV ?? "development",
  INFRALANE_BASE_URL: process.env.INFRALANE_BASE_URL ?? "http://localhost:3000",
  INFRALANE_SESSION_SECRET: process.env.INFRALANE_SESSION_SECRET,
  INFRALANE_WORKER_MODE: process.env.INFRALANE_WORKER_MODE,
  AUTOMATION_WORKER_SECRET: process.env.AUTOMATION_WORKER_SECRET,
  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET,
  SMTP_HOST: process.env.SMTP_HOST,
};
