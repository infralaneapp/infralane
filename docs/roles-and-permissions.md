# Roles & Permissions

Infralane uses a three-tier role system. Permissions are centralized in `lib/auth/permissions.ts`.

## Roles

| Role | Description |
|------|-------------|
| **REQUESTER** | End users who submit tickets. Can only see their own tickets. |
| **OPERATOR** | Team members who work tickets. Can see all tickets, assign, change status, approve/reject requests, view reports and audit logs. Cannot manage settings or automation rules. |
| **ADMIN** | Full access. Everything operators can do plus: manage team, ticket types, templates, automation rules, integrations. |

## Permission Matrix

| Permission | REQUESTER | OPERATOR | ADMIN |
|------------|-----------|----------|-------|
| Create tickets | Yes | Yes | Yes |
| View own tickets | Yes | Yes | Yes |
| View all tickets | — | Yes | Yes |
| Assign tickets | — | Yes | Yes |
| Change ticket status | — | Yes | Yes |
| Comment on any ticket | — | Yes | Yes |
| View dashboard | — | Yes | Yes |
| View board | — | Yes | Yes |
| View audit log | — | Yes | Yes |
| View reports | — | Yes | Yes |
| View automation jobs | — | Yes | Yes |
| Retry failed jobs | — | Yes | Yes |
| Approve/reject requests | — | Yes | Yes |
| Manage ticket types | — | — | Yes |
| Manage templates | — | — | Yes |
| Manage automation rules | — | — | Yes |
| Manage integrations | — | — | Yes |
| Manage team/roles | — | — | Yes |

## Navigation Visibility

- **All users**: Tickets, New ticket, Profile
- **Staff (OPERATOR + ADMIN)**: Dashboard, Board, Approvals
- **ADMIN only**: Settings (Ticket Types, Templates, Automations, Integrations, Team)

## How Permissions Are Checked

### API Routes

```typescript
import { hasPermission, isStaffRole } from "@/lib/auth/permissions";

// Staff-level check (OPERATOR or ADMIN)
if (!user || !isStaffRole(user.role)) return apiError("Forbidden.", ...);

// Specific permission check
if (!user || !hasPermission(user.role, "settings:manage")) return apiError("Forbidden.", ...);
```

### Service Layer

```typescript
import { isStaffRole } from "@/lib/auth/permissions";

// The isAdmin helper now checks for OPERATOR or ADMIN
function isAdmin(actor: TicketActor) {
  return isStaffRole(actor.role);
}
```

### Page Components

```typescript
import { isStaffRole } from "@/lib/auth/permissions";

// Server component redirect
if (!isStaffRole(sessionUser.role)) redirect("/tickets");

// Conditional rendering
const isAdmin = isStaffRole(sessionUser.role);
{isAdmin && <AdminOnlyComponent />}
```

## Changing Roles

Admins can change user roles in **Settings > Team**. The dropdown shows all three roles. An admin cannot change their own role (safety guard).

Users who sign in via Slack OAuth are created as REQUESTER by default. An admin must promote them to OPERATOR or ADMIN.
