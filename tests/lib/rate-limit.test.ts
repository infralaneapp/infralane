import { describe, it, expect, afterEach, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("rate limiter", () => {
  // Use unique keys per test to avoid cross-contamination
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests within limit", () => {
    const key = "test-allow-" + Math.random();
    const config = { max: 3, windowSeconds: 60 };
    expect(checkRateLimit(key, config).allowed).toBe(true);
    expect(checkRateLimit(key, config).allowed).toBe(true);
    expect(checkRateLimit(key, config).allowed).toBe(true);
  });

  it("blocks requests over limit", () => {
    const key = "test-block-" + Math.random();
    const config = { max: 2, windowSeconds: 60 };
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const result = checkRateLimit(key, config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns correct remaining count", () => {
    const key = "test-remaining-" + Math.random();
    const config = { max: 5, windowSeconds: 60 };
    const r1 = checkRateLimit(key, config);
    expect(r1.remaining).toBe(4);
    const r2 = checkRateLimit(key, config);
    expect(r2.remaining).toBe(3);
    const r3 = checkRateLimit(key, config);
    expect(r3.remaining).toBe(2);
  });

  it("different keys are independent", () => {
    const config = { max: 1, windowSeconds: 60 };
    const k1 = "test-indep-a-" + Math.random();
    const k2 = "test-indep-b-" + Math.random();
    expect(checkRateLimit(k1, config).allowed).toBe(true);
    expect(checkRateLimit(k2, config).allowed).toBe(true);
    // Both should now be exhausted
    expect(checkRateLimit(k1, config).allowed).toBe(false);
    expect(checkRateLimit(k2, config).allowed).toBe(false);
  });

  it("returns a resetAt timestamp in the future", () => {
    const key = "test-reset-" + Math.random();
    const config = { max: 5, windowSeconds: 60 };
    const now = Date.now();
    const result = checkRateLimit(key, config);
    expect(result.resetAt).toBeGreaterThan(now);
    expect(result.resetAt).toBeLessThanOrEqual(now + 60 * 1000 + 100);
  });

  it("keeps remaining at 0 for repeated blocked requests", () => {
    const key = "test-zero-" + Math.random();
    const config = { max: 1, windowSeconds: 60 };
    checkRateLimit(key, config); // allowed
    const r2 = checkRateLimit(key, config); // blocked
    const r3 = checkRateLimit(key, config); // blocked again
    expect(r2.remaining).toBe(0);
    expect(r3.remaining).toBe(0);
  });

  it("max of 1 allows exactly one request", () => {
    const key = "test-max1-" + Math.random();
    const config = { max: 1, windowSeconds: 60 };
    const first = checkRateLimit(key, config);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(0);
    const second = checkRateLimit(key, config);
    expect(second.allowed).toBe(false);
  });
});
