import { describe, it, expect, vi, beforeEach } from "vitest";

describe("env validation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("throws when DATABASE_URL is not set", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "development");

    const { validateEnv } = await import("@/lib/env");
    expect(() => validateEnv()).toThrow("DATABASE_URL is required");

    vi.unstubAllEnvs();
  });

  it("passes validation when DATABASE_URL is set in development", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("NODE_ENV", "development");

    const { validateEnv, env } = await import("@/lib/env");
    expect(() => validateEnv()).not.toThrow();
    expect(env.DATABASE_URL).toBe("postgresql://localhost:5432/test");

    vi.unstubAllEnvs();
  });

  it("throws in production when INFRALANE_SESSION_SECRET is not set", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INFRALANE_SESSION_SECRET", "");

    const { validateEnv } = await import("@/lib/env");
    expect(() => validateEnv()).toThrow("INFRALANE_SESSION_SECRET is required");

    vi.unstubAllEnvs();
  });

  it("throws in production when session secret is too short", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INFRALANE_SESSION_SECRET", "tooshort");

    const { validateEnv } = await import("@/lib/env");
    expect(() => validateEnv()).toThrow("at least 32 characters");

    vi.unstubAllEnvs();
  });

  it("passes in production with valid config", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INFRALANE_SESSION_SECRET", "a".repeat(32));

    const { validateEnv } = await import("@/lib/env");
    expect(() => validateEnv()).not.toThrow();

    vi.unstubAllEnvs();
  });

  it("does not throw in dev without session secret", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("INFRALANE_SESSION_SECRET", "");

    const { validateEnv } = await import("@/lib/env");
    expect(() => validateEnv()).not.toThrow();

    vi.unstubAllEnvs();
  });

  it("warns about optional vars", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SLACK_CLIENT_ID", "");
    vi.stubEnv("SMTP_HOST", "");

    const { validateEnv } = await import("@/lib/env");
    validateEnv();

    expect(console.warn).toHaveBeenCalled();

    vi.unstubAllEnvs();
  });

  it("exports env with defaults", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("NODE_ENV", "development");

    const { env } = await import("@/lib/env");
    expect(env.INFRALANE_BASE_URL).toBe("http://localhost:3000");
    expect(env.NODE_ENV).toBe("development");

    vi.unstubAllEnvs();
  });
});
