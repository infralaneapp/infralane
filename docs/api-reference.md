# API Reference

All API routes are under `/api/`. Responses follow a consistent format:

**Success**: `{ "success": true, "data": { ... } }`
**Error**: `{ "success": false, "error": { "code": "...", "message": "...", "details?": ... } }`

Authentication is via session cookie (`infralane_session`), set on login.

---

## Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Email/password login | Public |
| POST | `/api/auth/register` | Create account | Public |
| POST | `/api/auth/logout` | Clear session | Authenticated |
| GET | `/api/auth/slack` | Initiate Slack OAuth flow | Public |
| GET | `/api/auth/slack/callback` | Slack OAuth callback | Public (Slack redirects here) |
| PATCH | `/api/auth/profile` | Update name/email | Authenticated |
| PATCH | `/api/auth/password` | Change password | Authenticated |

### POST /api/auth/login

```json
{ "email": "alex.hart@infralane.local", "password": "password123" }
```

### POST /api/auth/register

```json
{ "email": "new@example.com", "name": "New User", "password": "securepassword" }
```

---

## Tickets

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/tickets` | List tickets (paginated, filterable) | Authenticated (scoped by role) |
| POST | `/api/tickets` | Create ticket | Authenticated |
| GET | `/api/tickets/[id]` | Get ticket detail | Authenticated (scoped) |
| PATCH | `/api/tickets/[id]` | Update ticket (title, description, fields) | Staff |
| PATCH | `/api/tickets/[id]/assign` | Assign ticket | Staff |
| PATCH | `/api/tickets/[id]/status` | Change ticket status | Staff |
| POST | `/api/tickets/[id]/reopen` | Reopen resolved/closed ticket | Requester (own) |
| POST | `/api/tickets/[id]/comments` | Add comment | Authenticated (scoped) |
| GET | `/api/tickets/[id]/comments` | List comments | Authenticated (scoped) |
| POST | `/api/tickets/[id]/tags` | Add/remove tags | Staff |
| POST | `/api/tickets/[id]/attachments` | Upload file | Authenticated |
| GET | `/api/tickets/[id]/relations` | Get related tickets | Authenticated |
| GET | `/api/tickets/[id]/automation-jobs` | List automation jobs for ticket | Staff |
| GET | `/api/tickets/[id]/automation-trace` | Evaluate all rules against ticket | Staff |
| GET | `/api/tickets/search` | Full-text search | Authenticated (scoped) |
| GET | `/api/tickets/export` | Export tickets as CSV | Authenticated (scoped) |
| POST | `/api/tickets/bulk` | Bulk assign/close | Staff |

### POST /api/tickets

```json
{
  "title": "Grant production access",
  "description": "Need read access to Datadog",
  "ticketTypeId": "cuid...",
  "priority": "HIGH",
  "fields": { "system": "Datadog", "environment": "production" }
}
```

### GET /api/tickets?status=OPEN&page=1&assigneeId=cuid...

Query parameters: `status`, `ticketTypeId`, `assigneeId`, `search`, `page`, `pageSize`

---

## Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/notifications` | List notifications + unread count | Authenticated |
| POST | `/api/notifications` | Mark all as read | Authenticated |
| PATCH | `/api/notifications/[id]` | Mark single as read | Authenticated (own) |

### GET /api/sse

Server-Sent Events stream. Sends heartbeat every 30s. Events pushed on notification creation.

---

## Approvals

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/approvals?status=PENDING` | List approval requests | `approvals:decide` |
| POST | `/api/approvals/[id]/approve` | Approve request | `approvals:decide` |
| POST | `/api/approvals/[id]/reject` | Reject request | `approvals:decide` |

### POST /api/approvals/[id]/reject

```json
{ "reason": "Not authorized for production access" }
```

---

## Automation

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/automation/jobs?status=DEAD_LETTER&page=1` | List all jobs (paginated) | Staff |
| POST | `/api/automation/jobs/[jobId]/retry` | Retry failed/dead-lettered job | `automation:retry_jobs` |
| POST | `/api/automation/process` | Manually trigger worker tick | Bearer token (`AUTOMATION_WORKER_SECRET`) |
| GET | `/api/automation/metrics` | Automation health metrics | Staff |

### GET /api/automation/metrics

Returns:
```json
{
  "summary": { "totalJobs": 150, "succeeded": 120, "failed": 10, "deadLettered": 5, "queued": 15, "pendingApproval": 3 },
  "perRuleStats": [{ "ruleId": "...", "ruleName": "...", "evaluated": 50, "matched": 45, "dedupSkipped": 3 }],
  "recentFailures": [...],
  "queueDepth": 15,
  "oldestQueuedAt": "2026-04-10T..."
}
```

---

## Settings (Admin Only)

### Automation Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/automations` | List rules with job counts |
| POST | `/api/settings/automations` | Create rule |
| PATCH | `/api/settings/automations/[id]` | Update rule |
| DELETE | `/api/settings/automations/[id]` | Delete rule (not built-in) |
| GET | `/api/settings/automations/[id]/jobs` | List jobs for a rule |

### POST /api/settings/automations

```json
{
  "name": "Auto-tag staging",
  "trigger": "TICKET_CREATED",
  "conditions": { "environment": "staging" },
  "action": "ADD_TAG",
  "actionValue": "staging",
  "enabled": true,
  "requiresApproval": false
}
```

### Ticket Types

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/ticket-types` | List ticket types |
| POST | `/api/settings/ticket-types` | Create ticket type |
| PATCH | `/api/settings/ticket-types/[id]` | Update ticket type |
| DELETE | `/api/settings/ticket-types/[id]` | Archive ticket type |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/templates` | List templates (any user) |
| POST | `/api/settings/templates` | Create template (admin) |

### Team

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/team` | List team members (with slackUserId) |
| PATCH | `/api/settings/team` | Update role or slackUserId |

```json
{ "userId": "cuid...", "role": "OPERATOR" }
{ "userId": "cuid...", "slackUserId": "U12345678" }
```

### Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/integrations?provider=slack` | Get integration config |
| POST | `/api/settings/integrations` | Create/update integration |

```json
{
  "provider": "slack",
  "config": {
    "webhookUrl": "https://hooks.slack.com/services/...",
    "botToken": "xoxb-...",
    "signingSecret": "...",
    "defaultChannel": "#ops-alerts"
  },
  "enabled": true
}
```

### Slack Interactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/integrations/slack/interactions` | Slack interactive message callback |

---

## Reports & Audit

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/reports/sla` | SLA compliance report | Staff |
| GET | `/api/audit?page=1&type=STATUS_CHANGED` | Activity audit log | Staff |

### Saved Filters

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/saved-filters` | List user's saved filters |
| POST | `/api/saved-filters` | Save a filter |

### Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tags` | List all tags (any user) |
| POST | `/api/tags` | Create tag (staff) |
