import { describe, it, expect } from "vitest";
import { hasPermission, isStaffRole } from "@/lib/auth/permissions";

describe("permissions", () => {
  describe("isStaffRole", () => {
    it("returns true for OPERATOR", () => expect(isStaffRole("OPERATOR")).toBe(true));
    it("returns true for ADMIN", () => expect(isStaffRole("ADMIN")).toBe(true));
    it("returns false for REQUESTER", () => expect(isStaffRole("REQUESTER")).toBe(false));
    it("returns false for unknown", () => expect(isStaffRole("UNKNOWN")).toBe(false));
  });

  describe("hasPermission", () => {
    it("ADMIN has settings:manage", () => expect(hasPermission("ADMIN", "settings:manage")).toBe(true));
    it("OPERATOR does not have settings:manage", () => expect(hasPermission("OPERATOR", "settings:manage")).toBe(false));
    it("OPERATOR has ticket:assign", () => expect(hasPermission("OPERATOR", "ticket:assign")).toBe(true));
    it("REQUESTER has no permissions", () => expect(hasPermission("REQUESTER", "ticket:view_all")).toBe(false));
    it("OPERATOR has approvals:decide", () => expect(hasPermission("OPERATOR", "approvals:decide")).toBe(true));
  });
});
