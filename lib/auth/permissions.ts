import { AppError } from "@/lib/errors";

export type Permission =
  | "ticket:view_all"
  | "ticket:assign"
  | "ticket:change_status"
  | "ticket:comment_all"
  | "automation:view_jobs"
  | "automation:retry_jobs"
  | "settings:manage"
  | "settings:automation_rules"
  | "settings:team"
  | "audit:view"
  | "reports:view"
  | "approvals:decide";

const OPERATOR_PERMISSIONS: Permission[] = [
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

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  REQUESTER: [],
  OPERATOR: OPERATOR_PERMISSIONS,
  ADMIN: [...OPERATOR_PERMISSIONS, "settings:manage", "settings:automation_rules", "settings:team"],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

export function assertPermission(role: string, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new AppError("Forbidden.", { status: 403, code: "FORBIDDEN" });
  }
}

/** Check if a role is at least operator-level (OPERATOR or ADMIN). */
export function isStaffRole(role: string): boolean {
  return role === "OPERATOR" || role === "ADMIN";
}
