import { describe, it, expect } from "vitest";
import { evaluateConditions, type TicketSnapshot } from "@/modules/automation/conditions";

function makeTicket(overrides: Partial<TicketSnapshot> = {}): TicketSnapshot {
  return {
    priority: "HIGH",
    status: "OPEN",
    assigneeId: "user-1",
    ticketType: { key: "bug" },
    tags: [{ tag: { name: "urgent" } }, { tag: { name: "Backend" } }],
    fields: [
      { key: "environment", value: "production" },
      { key: "severity", value: "critical" },
    ],
    ...overrides,
  };
}

describe("evaluateConditions", () => {
  it("returns true for empty conditions", () => {
    expect(evaluateConditions({}, makeTicket())).toBe(true);
  });

  describe("ticketType matching", () => {
    it("matches when ticketType key equals expected", () => {
      expect(evaluateConditions({ ticketType: "bug" }, makeTicket())).toBe(true);
    });

    it("returns false when ticketType does not match", () => {
      expect(evaluateConditions({ ticketType: "feature" }, makeTicket())).toBe(false);
    });
  });

  describe("priority matching", () => {
    it("matches when priority equals expected", () => {
      expect(evaluateConditions({ priority: "HIGH" }, makeTicket())).toBe(true);
    });

    it("returns false when priority does not match", () => {
      expect(evaluateConditions({ priority: "LOW" }, makeTicket())).toBe(false);
    });
  });

  describe("status matching", () => {
    it("matches when status equals expected", () => {
      expect(evaluateConditions({ status: "OPEN" }, makeTicket())).toBe(true);
    });

    it("returns false when status does not match", () => {
      expect(evaluateConditions({ status: "CLOSED" }, makeTicket())).toBe(false);
    });
  });

  describe("assigneeId matching", () => {
    it("matches specific assignee ID", () => {
      expect(evaluateConditions({ assigneeId: "user-1" }, makeTicket())).toBe(true);
    });

    it("returns false for wrong assignee ID", () => {
      expect(evaluateConditions({ assigneeId: "user-999" }, makeTicket())).toBe(false);
    });

    it("'null' matches unassigned tickets", () => {
      const ticket = makeTicket({ assigneeId: null });
      expect(evaluateConditions({ assigneeId: "null" }, ticket)).toBe(true);
    });

    it("'null' does not match assigned tickets", () => {
      expect(evaluateConditions({ assigneeId: "null" }, makeTicket())).toBe(false);
    });

    it("'any' matches assigned tickets", () => {
      expect(evaluateConditions({ assigneeId: "any" }, makeTicket())).toBe(true);
    });

    it("'any' does not match unassigned tickets", () => {
      const ticket = makeTicket({ assigneeId: null });
      expect(evaluateConditions({ assigneeId: "any" }, ticket)).toBe(false);
    });
  });

  describe("tag matching", () => {
    it("matches existing tag (exact case)", () => {
      expect(evaluateConditions({ tag: "urgent" }, makeTicket())).toBe(true);
    });

    it("matches tag case-insensitively", () => {
      expect(evaluateConditions({ tag: "URGENT" }, makeTicket())).toBe(true);
      expect(evaluateConditions({ tag: "Urgent" }, makeTicket())).toBe(true);
      expect(evaluateConditions({ tag: "backend" }, makeTicket())).toBe(true);
    });

    it("returns false for non-existent tag", () => {
      expect(evaluateConditions({ tag: "nonexistent" }, makeTicket())).toBe(false);
    });

    it("returns false when ticket has no tags", () => {
      const ticket = makeTicket({ tags: [] });
      expect(evaluateConditions({ tag: "urgent" }, ticket)).toBe(false);
    });
  });

  describe("custom field matching", () => {
    it("matches custom field by key and value", () => {
      expect(evaluateConditions({ environment: "production" }, makeTicket())).toBe(true);
    });

    it("returns false when field value does not match", () => {
      expect(evaluateConditions({ environment: "staging" }, makeTicket())).toBe(false);
    });

    it("returns false when field key does not exist", () => {
      expect(evaluateConditions({ region: "us-east" }, makeTicket())).toBe(false);
    });
  });

  describe("multiple conditions (AND logic)", () => {
    it("matches when all conditions are satisfied", () => {
      const conditions = {
        ticketType: "bug",
        priority: "HIGH",
        status: "OPEN",
        tag: "urgent",
      };
      expect(evaluateConditions(conditions, makeTicket())).toBe(true);
    });

    it("returns false if any single condition fails", () => {
      const conditions = {
        ticketType: "bug",
        priority: "LOW", // does not match
        status: "OPEN",
      };
      expect(evaluateConditions(conditions, makeTicket())).toBe(false);
    });

    it("matches combined built-in and custom field conditions", () => {
      const conditions = {
        priority: "HIGH",
        environment: "production",
        severity: "critical",
      };
      expect(evaluateConditions(conditions, makeTicket())).toBe(true);
    });

    it("returns false when custom field fails in combined conditions", () => {
      const conditions = {
        priority: "HIGH",
        environment: "staging", // does not match
      };
      expect(evaluateConditions(conditions, makeTicket())).toBe(false);
    });
  });
});
