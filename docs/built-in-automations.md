# Built-in Automations

Infralane ships with 7 built-in automation rules and 3 templates. These are seeded on first run and identified by `systemKey` for idempotent re-seeding.

## Built-in Rules

| # | System Key | Name | Trigger | Conditions | Action | Approval |
|---|-----------|------|---------|------------|--------|----------|
| 1 | `auto-assign-urgent-incidents` | Auto-assign urgent incidents | TICKET_CREATED | ticketType=incident, priority=URGENT | ASSIGN_TO | No |
| 2 | `stale-requester-reminder` | Stale requester reminder | STALE_WAITING | (none) | NOTIFY requester | No |
| 3 | `incident-escalation-sla` | Incident escalation on SLA breach | SLA_BREACHED | ticketType=incident, priority=HIGH | CHANGE_PRIORITY → URGENT | No |
| 4 | `auto-tag-production` | Auto-tag production environment | TICKET_CREATED | environment=production | ADD_TAG → "production" | No |
| 5 | `auto-close-resolved` | Auto-close resolved tickets | RESOLVED_EXPIRED | (none) | CHANGE_STATUS → CLOSED | No |
| 6 | `prod-access-approval` | Production access approval | TICKET_CREATED | ticketType=access, environment=production | NOTIFY requester | Yes |
| 7 | `prod-deployment-approval` | Production deployment approval | TICKET_CREATED | ticketType=deployment, environment=production | NOTIFY requester | Yes |

### What Each Rule Does

**Auto-assign urgent incidents**: When an urgent incident is created, it's automatically assigned. The action value is set to `auto` by default — configure it with a specific user ID to target a primary on-call operator.

**Stale requester reminder**: When a ticket has been in WAITING_FOR_REQUESTER for more than 3 days, the requester gets a notification reminding them to respond.

**Incident escalation on SLA breach**: When a HIGH priority incident breaches its SLA thresholds (4h response or 24h resolution), it's automatically escalated to URGENT priority.

**Auto-tag production**: Any ticket created with `environment=production` in its structured fields automatically gets the "production" tag.

**Auto-close resolved tickets**: Tickets that have been in RESOLVED status for more than 7 days are automatically moved to CLOSED.

**Production access/deployment approval**: When someone requests production access or a production deployment, the automation pauses for human approval before proceeding. Operators and admins see these in the Approvals queue.

### Managing Built-in Rules

- Built-in rules show a "Built-in" badge in Settings > Automations
- They can be **disabled** (toggle off) but not **deleted**
- Their name can be edited
- Re-seeding (`npx prisma db seed`) uses `systemKey` to upsert — it won't create duplicates even if you rename them

## Built-in Templates

| System Key | Name | Type | Priority | Pre-filled Title |
|-----------|------|------|----------|-----------------|
| `standard-access-request` | Standard access request | Access | MEDIUM | "Access request: [system name]" |
| `emergency-deployment` | Emergency deployment | Deployment | URGENT | "EMERGENCY: Deploy [service] [version]" |
| `sev1-incident` | Sev1 incident | Incident | URGENT | "SEV1: [affected service] — [symptoms]" |

Templates pre-fill ticket creation forms with sensible defaults for common scenarios.

## SLA Thresholds

The SLA checker uses these hardcoded thresholds:

| Priority | Response Time | Resolution Time |
|----------|--------------|-----------------|
| URGENT | 1 hour | 4 hours |
| HIGH | 4 hours | 24 hours |
| MEDIUM | 8 hours | 72 hours (3 days) |
| LOW | 24 hours | 168 hours (7 days) |

## Periodic Check Intervals

| Check | Interval | What It Does |
|-------|----------|--------------|
| Job processing | 5 seconds | Claims and executes QUEUED automation jobs |
| SLA breach | 60 seconds | Checks active tickets against SLA thresholds |
| Stale waiting | 60 seconds | Finds tickets in WAITING_FOR_REQUESTER > 3 days |
| Resolved expiry | 60 seconds | Finds tickets in RESOLVED > 7 days |
| Approval expiry | 60 seconds | Expires PENDING approvals past their expiresAt |
