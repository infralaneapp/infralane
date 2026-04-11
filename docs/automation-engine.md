# Automation Engine

The automation engine is a trigger-action framework that automatically performs ticket mutations based on configurable rules.

## How It Works

```
Ticket Mutation (create, status change, etc.)
  → emitTrigger(trigger, ticketId, context)
    → Find enabled rules matching the trigger
    → Evaluate conditions against ticket snapshot
    → Create AutomationJob records (QUEUED or PENDING_APPROVAL)

Worker (5-second poll)
  → Claim batch of QUEUED jobs (atomic, skip-locked)
  → Execute action for each job
  → Record result (SUCCEEDED / retry with backoff / DEAD_LETTER)
  → Log lifecycle events
```

## Triggers

| Trigger | When It Fires | Context |
|---------|---------------|---------|
| `TICKET_CREATED` | After a new ticket is created | — |
| `STATUS_CHANGED` | After ticket status is updated | `{ previousStatus, newStatus }` |
| `PRIORITY_CHANGED` | After ticket priority changes | `{ previousPriority, newPriority }` |
| `SLA_BREACHED` | When SLA thresholds are exceeded (60s check) | `{ responseBreached, resolutionBreached, priority }` |
| `STALE_WAITING` | Ticket in WAITING_FOR_REQUESTER > 3 days (60s check) | `{ staleDays }` |
| `RESOLVED_EXPIRED` | Ticket in RESOLVED > 7 days (60s check) | `{ expiryDays }` |

**One-shot vs Repeatable:**
- `TICKET_CREATED` is one-shot: a rule only fires once per ticket.
- All other triggers are repeatable: the same rule can fire multiple times on the same ticket (e.g., multiple status changes).

## Conditions

Conditions are key-value pairs evaluated with AND logic. All must match for the rule to fire.

| Key | Matches Against | Example |
|-----|-----------------|---------|
| `ticketType` | Ticket type key | `incident` |
| `priority` | Ticket priority | `URGENT` |
| `status` | Ticket status | `OPEN` |
| `assigneeId` | Assignee user ID, `"null"` (unassigned), `"any"` (assigned) | `null` |
| `tag` | Tag name (case-insensitive) | `production` |
| Any other key | Structured field value | `environment: production` |

Empty conditions = rule matches all tickets for that trigger.

## Actions

| Action | Behavior | Idempotency |
|--------|----------|-------------|
| `ASSIGN_TO` | Set ticket assignee | Skips if already assigned to target |
| `CHANGE_STATUS` | Update status + SLA timestamps | Skips if already at target status |
| `CHANGE_PRIORITY` | Update priority | Skips if already at target |
| `ADD_TAG` | Create tag if needed, link to ticket | Upsert handles duplicates |
| `NOTIFY` | In-app notification + Slack DM. Value: user ID, `"requester"`, or `"assignee"` | Always succeeds |
| `SLACK_NOTIFY` | Send message to Slack channel | Requires Slack integration enabled |
| `WEBHOOK` | Fire outbound HTTP request to a configured endpoint | Value: WebhookEndpoint ID |

## Deduplication

Each job gets a `dedupKey` — a SHA-256 hash of `(ruleId, ticketId, trigger, context)`. This prevents duplicate jobs from identical trigger emissions.

- **One-shot triggers**: Skip if any SUCCEEDED/QUEUED/RUNNING job with same dedupKey exists.
- **Repeatable triggers**: Skip only if QUEUED/RUNNING job with same dedupKey exists.

## Retry & Backoff

| Attempt | Delay |
|---------|-------|
| 1st retry | ~10s |
| 2nd retry | ~20s |
| 3rd retry | ~40s |
| Exhausted | Job moves to DEAD_LETTER |

Formula: `min(5000ms * 2^attempts + random(0-1000ms), 300000ms)`

Dead-lettered jobs can be manually retried from the UI (Settings > Automations > View jobs) or via the API.

## Job Lifecycle Events

Every state transition is logged to `AutomationJobEvent`:

```
QUEUED → RUNNING → SUCCEEDED
QUEUED → RUNNING → RETRYING → RUNNING → SUCCEEDED
QUEUED → RUNNING → RETRYING → RUNNING → RETRYING → RUNNING → DEAD_LETTERED
PENDING_APPROVAL → (approved) → QUEUED → RUNNING → SUCCEEDED
PENDING_APPROVAL → (rejected) → SKIPPED
```

Events are visible in the automation panel on ticket detail pages (expandable per job).

## Rule Evaluation Metrics

Every rule evaluation (match or non-match) is persisted to `AutomationRuleEvaluation` for observability:
- `matched: true/false` — whether conditions matched
- `dedupSkipped: true/false` — whether a duplicate prevented job creation

Metrics available at `GET /api/automation/metrics`.

## Creating Rules

**Settings > Automations > Create rule**

Fields:
- **Name**: Human-readable identifier
- **Trigger**: When to evaluate this rule
- **Conditions**: Key-value pairs (AND logic)
- **Action**: What to do when conditions match
- **Action Value**: Target for the action (user ID, status, tag name, etc.)
- **Requires Approval**: If checked, job enters PENDING_APPROVAL instead of QUEUED

## Built-in Rules

Infralane ships with 7 built-in rules (see [Built-in Automations](./built-in-automations.md)). Built-in rules:
- Have a `systemKey` for stable identification across seeds
- Can be disabled but not deleted
- Show a "Built-in" badge in the UI

## Cascade Prevention

Executors write directly to Prisma (not through service functions that call `emitTrigger`). This means an automation that changes a ticket's status will NOT trigger `STATUS_CHANGED` rules on that same change.
