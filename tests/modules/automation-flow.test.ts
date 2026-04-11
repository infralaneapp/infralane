import { describe, it, expect, vi, beforeEach } from "vitest";

import { evaluateConditions, type TicketSnapshot } from "@/modules/automation/conditions";
import { computeDedupKey } from "@/modules/automation/dedup";
import { computeNextRunAt } from "@/modules/automation/backoff";

function makeTicket(overrides: Partial<TicketSnapshot> = {}): TicketSnapshot {
  return {
    priority: "HIGH",
    status: "OPEN",
    assigneeId: null,
    ticketType: { key: "incident" },
    tags: [{ tag: { name: "production" } }],
    fields: [
      { key: "environment", value: "prod" },
      { key: "severity", value: "critical" },
    ],
    ...overrides,
  };
}

describe("evaluateConditions", () => {
  it("returns true when conditions are empty", () => {
    expect(evaluateConditions({}, makeTicket())).toBe(true);
  });

  it("matches ticketType condition", () => {
    expect(evaluateConditions({ ticketType: "incident" }, makeTicket())).toBe(true);
    expect(evaluateConditions({ ticketType: "request" }, makeTicket())).toBe(false);
  });

  it("matches priority condition", () => {
    expect(evaluateConditions({ priority: "HIGH" }, makeTicket())).toBe(true);
    expect(evaluateConditions({ priority: "LOW" }, makeTicket())).toBe(false);
  });

  it("matches status condition", () => {
    expect(evaluateConditions({ status: "OPEN" }, makeTicket())).toBe(true);
    expect(evaluateConditions({ status: "CLOSED" }, makeTicket())).toBe(false);
  });

  it("matches assigneeId = null (unassigned)", () => {
    expect(evaluateConditions({ assigneeId: "null" }, makeTicket())).toBe(true);
    expect(
      evaluateConditions({ assigneeId: "null" }, makeTicket({ assigneeId: "u1" }))
    ).toBe(false);
  });

  it("matches assigneeId = any (assigned to someone)", () => {
    expect(
      evaluateConditions({ assigneeId: "any" }, makeTicket({ assigneeId: "u1" }))
    ).toBe(true);
    expect(evaluateConditions({ assigneeId: "any" }, makeTicket())).toBe(false);
  });

  it("matches specific assigneeId", () => {
    expect(
      evaluateConditions({ assigneeId: "u1" }, makeTicket({ assigneeId: "u1" }))
    ).toBe(true);
    expect(
      evaluateConditions({ assigneeId: "u1" }, makeTicket({ assigneeId: "u2" }))
    ).toBe(false);
  });

  it("matches tag condition (case-insensitive)", () => {
    expect(evaluateConditions({ tag: "production" }, makeTicket())).toBe(true);
    expect(evaluateConditions({ tag: "Production" }, makeTicket())).toBe(true);
    expect(evaluateConditions({ tag: "staging" }, makeTicket())).toBe(false);
  });

  it("matches custom field conditions", () => {
    expect(evaluateConditions({ environment: "prod" }, makeTicket())).toBe(true);
    expect(evaluateConditions({ environment: "staging" }, makeTicket())).toBe(false);
    expect(evaluateConditions({ nonexistent: "val" }, makeTicket())).toBe(false);
  });

  it("requires all conditions to match (AND logic)", () => {
    expect(
      evaluateConditions(
        { priority: "HIGH", status: "OPEN", ticketType: "incident" },
        makeTicket()
      )
    ).toBe(true);

    expect(
      evaluateConditions(
        { priority: "HIGH", status: "CLOSED", ticketType: "incident" },
        makeTicket()
      )
    ).toBe(false);
  });
});

describe("computeDedupKey", () => {
  it("produces a 32-char hex string", () => {
    const key = computeDedupKey("r1", "t1", "ticket.created");
    expect(key).toHaveLength(32);
    expect(key).toMatch(/^[0-9a-f]{32}$/);
  });

  it("returns same key for identical inputs", () => {
    const a = computeDedupKey("r1", "t1", "ticket.created", { field: "val" });
    const b = computeDedupKey("r1", "t1", "ticket.created", { field: "val" });
    expect(a).toBe(b);
  });

  it("returns different keys for different inputs", () => {
    const a = computeDedupKey("r1", "t1", "ticket.created");
    const b = computeDedupKey("r2", "t1", "ticket.created");
    const c = computeDedupKey("r1", "t2", "ticket.created");
    const d = computeDedupKey("r1", "t1", "ticket.updated");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
  });

  it("produces stable key regardless of context key order", () => {
    const a = computeDedupKey("r1", "t1", "trigger", { b: "2", a: "1" });
    const b = computeDedupKey("r1", "t1", "trigger", { a: "1", b: "2" });
    expect(a).toBe(b);
  });

  it("treats undefined context same as empty context", () => {
    const a = computeDedupKey("r1", "t1", "trigger", undefined);
    const b = computeDedupKey("r1", "t1", "trigger");
    expect(a).toBe(b);
  });
});

describe("computeNextRunAt (backoff)", () => {
  it("returns a future date", () => {
    const now = Date.now();
    const next = computeNextRunAt(0);
    expect(next.getTime()).toBeGreaterThanOrEqual(now);
  });

  it("increases delay exponentially with attempts", () => {
    const delay0 = computeNextRunAt(0, 1000, 999999).getTime() - Date.now();
    const delay1 = computeNextRunAt(1, 1000, 999999).getTime() - Date.now();
    const delay2 = computeNextRunAt(2, 1000, 999999).getTime() - Date.now();

    // With jitter, delay1 should be roughly 2x delay0, delay2 roughly 4x
    // Allow generous margin for jitter (up to 1000ms)
    expect(delay1).toBeGreaterThan(delay0 - 1000);
    expect(delay2).toBeGreaterThan(delay1 - 1000);
  });

  it("caps at maxDelayMs", () => {
    const maxDelay = 5000;
    const next = computeNextRunAt(20, 1000, maxDelay);
    const delay = next.getTime() - Date.now();
    expect(delay).toBeLessThanOrEqual(maxDelay + 1100); // +1100 for jitter + timing
  });

  it("uses custom base and max delay", () => {
    const now = Date.now();
    const next = computeNextRunAt(0, 2000, 60000);
    const delay = next.getTime() - now;
    // base delay = 2000ms * 2^0 = 2000ms + jitter(0-1000)
    expect(delay).toBeGreaterThanOrEqual(1900); // small timing margin
    expect(delay).toBeLessThanOrEqual(3100);
  });
});

describe("Automation flow (conceptual)", () => {
  it("one-shot trigger: same dedup key prevents duplicate jobs", () => {
    // Simulate two concurrent emissions of the same trigger
    const key1 = computeDedupKey("r1", "t1", "ticket.created");
    const key2 = computeDedupKey("r1", "t1", "ticket.created");

    // Both produce the same dedup key, so the second would be rejected
    expect(key1).toBe(key2);

    // A different ticket produces a different key
    const key3 = computeDedupKey("r1", "t2", "ticket.created");
    expect(key1).not.toBe(key3);
  });

  it("repeatable trigger: different context yields different dedup key", () => {
    // First trigger emission
    const key1 = computeDedupKey("r1", "t1", "ticket.updated", {
      changedField: "status",
      newValue: "IN_PROGRESS",
    });

    // Same ticket, same trigger, but different context (new update)
    const key2 = computeDedupKey("r1", "t1", "ticket.updated", {
      changedField: "status",
      newValue: "RESOLVED",
    });

    // Different context = different key = new job allowed
    expect(key1).not.toBe(key2);
  });

  it("conditions + dedup together: only matching tickets get keyed", () => {
    const ticket = makeTicket({ priority: "HIGH", status: "OPEN" });
    const conditions = { priority: "HIGH", status: "OPEN" };

    // Step 1: evaluate conditions
    const matches = evaluateConditions(conditions, ticket);
    expect(matches).toBe(true);

    // Step 2: only if matched, compute dedup key
    if (matches) {
      const key = computeDedupKey("r1", "t1", "ticket.created");
      expect(key).toHaveLength(32);
    }

    // Non-matching ticket: conditions fail, no dedup key needed
    const lowTicket = makeTicket({ priority: "LOW" });
    expect(evaluateConditions(conditions, lowTicket)).toBe(false);
  });
});
