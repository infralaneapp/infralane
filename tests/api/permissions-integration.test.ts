import { describe, it, expect } from "vitest";
import {
  hasPermission,
  assertPermission,
  isStaffRole,
  type Permission,
} from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors";

const ALL_PERMISSIONS: Permission[] = [
  "ticket:view_all",
  "ticket:assign",
  "ticket:change_status",
  "ticket:comment_all",
  "automation:view_jobs",
  "automation:retry_jobs",
  "settings:manage",
  "settings:automation_rules",
  "settings:team",
  "audit:view",
  "reports:view",
  "approvals:decide",
];

describe("permission coverage", () => {
  it("ADMIN has all permissions", () => {
    for (const perm of ALL_PERMISSIONS) {
      expect(hasPermission("ADMIN", perm)).toBe(true);
    }
  });

  it("OPERATOR has operational but not settings permissions", () => {
    const operatorYes: Permission[] = [
      "ticket:view_all",
      "ticket:assign",
      "ticket:change_status",
      "ticket:comment_all",
      "automation:view_jobs",
      "automation:retry_jobs",
      "reports:view",
      "audit:view",
      "approvals:decide",
    ];
    const operatorNo: Permission[] = [
      "settings:manage",
      "settings:automation_rules",
      "settings:team",
    ];

    for (const perm of operatorYes) {
      expect(hasPermission("OPERATOR", perm)).toBe(true);
    }
    for (const perm of operatorNo) {
      expect(hasPermission("OPERATOR", perm)).toBe(false);
    }
  });

  it("REQUESTER has no permissions", () => {
    for (const perm of ALL_PERMISSIONS) {
      expect(hasPermission("REQUESTER", perm)).toBe(false);
    }
  });

  it("unknown role has no permissions", () => {
    for (const perm of ALL_PERMISSIONS) {
      expect(hasPermission("UNKNOWN_ROLE", perm)).toBe(false);
    }
  });
});

describe("assertPermission", () => {
  it("does not throw when role has permission", () => {
    expect(() => assertPermission("ADMIN", "settings:manage")).not.toThrow();
  });

  it("throws AppError with 403 when role lacks permission", () => {
    try {
      assertPermission("REQUESTER", "settings:manage");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).status).toBe(403);
      expect((err as AppError).code).toBe("FORBIDDEN");
    }
  });

  it("throws for OPERATOR accessing settings permissions", () => {
    expect(() => assertPermission("OPERATOR", "settings:manage")).toThrow();
    expect(() => assertPermission("OPERATOR", "settings:automation_rules")).toThrow();
    expect(() => assertPermission("OPERATOR", "settings:team")).toThrow();
  });
});

describe("isStaffRole", () => {
  it("returns true for OPERATOR", () => {
    expect(isStaffRole("OPERATOR")).toBe(true);
  });

  it("returns true for ADMIN", () => {
    expect(isStaffRole("ADMIN")).toBe(true);
  });

  it("returns false for REQUESTER", () => {
    expect(isStaffRole("REQUESTER")).toBe(false);
  });

  it("returns false for unknown roles", () => {
    expect(isStaffRole("VIEWER")).toBe(false);
    expect(isStaffRole("")).toBe(false);
  });
});
