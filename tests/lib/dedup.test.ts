import { describe, it, expect } from "vitest";
import { computeDedupKey } from "@/modules/automation/dedup";

describe("dedup key generation", () => {
  it("produces deterministic keys", () => {
    const key1 = computeDedupKey("rule1", "ticket1", "STATUS_CHANGED", { a: "1" });
    const key2 = computeDedupKey("rule1", "ticket1", "STATUS_CHANGED", { a: "1" });
    expect(key1).toBe(key2);
  });

  it("produces different keys for different contexts", () => {
    const key1 = computeDedupKey("rule1", "ticket1", "STATUS_CHANGED", { status: "OPEN" });
    const key2 = computeDedupKey("rule1", "ticket1", "STATUS_CHANGED", { status: "CLOSED" });
    expect(key1).not.toBe(key2);
  });

  it("produces different keys for different rules", () => {
    const key1 = computeDedupKey("rule1", "ticket1", "STATUS_CHANGED");
    const key2 = computeDedupKey("rule2", "ticket1", "STATUS_CHANGED");
    expect(key1).not.toBe(key2);
  });

  it("handles undefined context", () => {
    const key1 = computeDedupKey("rule1", "ticket1", "TICKET_CREATED");
    const key2 = computeDedupKey("rule1", "ticket1", "TICKET_CREATED", undefined);
    expect(key1).toBe(key2);
  });
});
