import { describe, it, expect, vi } from "vitest";
import { computeNextRunAt } from "@/modules/automation/backoff";

describe("computeNextRunAt", () => {
  it("returns a Date in the future", () => {
    const now = Date.now();
    const result = computeNextRunAt(0);
    expect(result.getTime()).toBeGreaterThan(now);
  });

  it("delay increases exponentially with attempts", () => {
    // Mock Math.random to eliminate jitter for deterministic testing
    vi.spyOn(Math, "random").mockReturnValue(0);

    const base = 5000;
    const d0 = computeNextRunAt(0, base, 300000);
    const d1 = computeNextRunAt(1, base, 300000);
    const d2 = computeNextRunAt(2, base, 300000);

    const now = Date.now();
    // With jitter=0: attempt 0 => 5000ms, attempt 1 => 10000ms, attempt 2 => 20000ms
    const delta0 = d0.getTime() - now;
    const delta1 = d1.getTime() - now;
    const delta2 = d2.getTime() - now;

    // Each subsequent attempt should have roughly double the delay
    expect(delta1).toBeGreaterThan(delta0);
    expect(delta2).toBeGreaterThan(delta1);

    // Verify approximate exponential growth (with some tolerance for timing)
    expect(delta0).toBeGreaterThanOrEqual(4900);
    expect(delta0).toBeLessThan(6000);
    expect(delta1).toBeGreaterThanOrEqual(9900);
    expect(delta1).toBeLessThan(11000);
    expect(delta2).toBeGreaterThanOrEqual(19900);
    expect(delta2).toBeLessThan(21000);

    vi.restoreAllMocks();
  });

  it("delay is capped at maxDelayMs", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const maxDelay = 30000; // 30 seconds
    const base = 5000;
    // attempt 10 => 5000 * 2^10 = 5120000, which exceeds maxDelay
    const result = computeNextRunAt(10, base, maxDelay);
    const now = Date.now();
    const delay = result.getTime() - now;

    expect(delay).toBeLessThanOrEqual(maxDelay + 100); // small tolerance
    expect(delay).toBeGreaterThanOrEqual(maxDelay - 100);

    vi.restoreAllMocks();
  });

  it("jitter adds randomness to the delay", () => {
    // With jitter = 0
    vi.spyOn(Math, "random").mockReturnValue(0);
    const noJitter = computeNextRunAt(0, 5000, 300000);

    vi.restoreAllMocks();

    // With jitter = max (random returns ~1)
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    const maxJitter = computeNextRunAt(0, 5000, 300000);

    vi.restoreAllMocks();

    // The difference should be close to 999ms (jitter range 0-999)
    const diff = maxJitter.getTime() - noJitter.getTime();
    expect(diff).toBeGreaterThanOrEqual(900);
    expect(diff).toBeLessThanOrEqual(1100);
  });

  it("uses default values when not specified", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const now = Date.now();
    // Default: baseDelayMs=5000, maxDelayMs=300000
    const result = computeNextRunAt(0);
    const delay = result.getTime() - now;

    expect(delay).toBeGreaterThanOrEqual(4900);
    expect(delay).toBeLessThan(6000);

    vi.restoreAllMocks();
  });

  it("returns a valid Date object", () => {
    const result = computeNextRunAt(3);
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });
});
