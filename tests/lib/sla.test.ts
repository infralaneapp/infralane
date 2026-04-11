import { describe, it, expect } from "vitest";
import { getSlaRemaining, formatSlaCountdown, DEFAULT_SLA_THRESHOLDS } from "@/lib/sla";

describe("SLA utilities", () => {
  it("returns null when response SLA is already met", () => {
    const result = getSlaRemaining("URGENT", new Date().toISOString(), "response", new Date().toISOString());
    expect(result).toBeNull();
  });

  it("returns positive remaining time for fresh ticket", () => {
    const result = getSlaRemaining("LOW", new Date().toISOString(), "response");
    expect(result).toBeGreaterThan(0);
  });

  it("returns negative for breached SLA", () => {
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48h ago
    const result = getSlaRemaining("URGENT", oldDate, "response"); // 1h threshold
    expect(result).toBeLessThan(0);
  });

  it("formats countdown correctly", () => {
    expect(formatSlaCountdown(3600000)).toBe("1h 0m remaining"); // 1 hour
    expect(formatSlaCountdown(-1800000)).toBe("Breached 30m ago"); // -30 min
  });

  it("has thresholds for all priorities", () => {
    expect(DEFAULT_SLA_THRESHOLDS.URGENT).toBeDefined();
    expect(DEFAULT_SLA_THRESHOLDS.HIGH).toBeDefined();
    expect(DEFAULT_SLA_THRESHOLDS.MEDIUM).toBeDefined();
    expect(DEFAULT_SLA_THRESHOLDS.LOW).toBeDefined();
  });
});
