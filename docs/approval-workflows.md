# Approval Workflows

Approval workflows gate automation execution behind human approval. When an automation rule has `requiresApproval: true`, the resulting job enters `PENDING_APPROVAL` status instead of being executed immediately.

## How It Works

```
Trigger fires → Rule matches → requiresApproval = true
  → Create AutomationJob (status: PENDING_APPROVAL)
  → Create ApprovalRequest (status: PENDING, expires in 7 days)
  → Create TicketActivity (APPROVAL_REQUESTED)
  → Notify designated approver (if set)

Operator/Admin approves:
  → ApprovalRequest → APPROVED
  → AutomationJob → QUEUED (worker picks it up)
  → TicketActivity (APPROVAL_APPROVED)
  → Notify requester

Operator/Admin rejects:
  → ApprovalRequest → REJECTED
  → AutomationJob → SKIPPED
  → TicketActivity (APPROVAL_REJECTED)
  → Notify requester

Expiry (7 days, no action):
  → ApprovalRequest → EXPIRED
  → AutomationJob → SKIPPED
```

## Approval Request Model

| Field | Description |
|-------|-------------|
| `ticketId` | The ticket this approval is for |
| `jobId` | Linked automation job (unique, optional) |
| `status` | PENDING, APPROVED, REJECTED, EXPIRED |
| `approverId` | Who approved/rejected (set on decision) |
| `requestedById` | The ticket requester |
| `reason` | Rejection reason (optional) |
| `expiresAt` | Auto-expire timestamp (default: 7 days from creation) |
| `decidedAt` | When the decision was made |

## Visibility Rules

| Role | What They See |
|------|---------------|
| **REQUESTER** | Approval status on their own ticket detail page only. No queue page. |
| **OPERATOR** | Full approval queue page (`/approvals`). Can approve/reject. |
| **ADMIN** | Same as operator. Can also create rules with `requiresApproval`. |

## API Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/approvals?status=PENDING` | List approval requests | `approvals:decide` |
| POST | `/api/approvals/[id]/approve` | Approve a request | `approvals:decide` |
| POST | `/api/approvals/[id]/reject` | Reject a request (body: `{ reason? }`) | `approvals:decide` |

## UI

### Approval Queue (`/approvals`)

Accessible from the sidebar for OPERATOR and ADMIN. Shows a filterable table of approval requests with:
- Ticket reference and title
- Rule name
- Requester name
- Status badge
- Approve/Reject buttons (for PENDING items)

### Ticket Detail

On the ticket detail page, approval status appears in the activity timeline:
- "Approval required for automation rule X" (APPROVAL_REQUESTED)
- "Approval granted" (APPROVAL_APPROVED)
- "Approval rejected: reason" (APPROVAL_REJECTED)

## Built-in Approval Rules

Two built-in rules require approval:

1. **Production access approval** — Fires on `TICKET_CREATED` when `ticketType=access` and `environment=production`
2. **Production deployment approval** — Fires on `TICKET_CREATED` when `ticketType=deployment` and `environment=production`

## Slack Interactive Approvals

If Slack integration is configured with a bot token, approval requests can be sent as interactive messages with Approve/Reject buttons. See [Slack Integration](./slack-integration.md) for setup.

The Slack interactions endpoint (`/api/integrations/slack/interactions`) maps the Slack user to an Infralane user via `User.slackUserId` and verifies they have `approvals:decide` permission before processing.

## Ticket Locking

While a ticket has a PENDING approval request, **status changes are blocked**. Operators cannot resolve, close, or progress the ticket until the approval is decided (approved, rejected, or expired).

- `PATCH /api/tickets/[id]/status` returns `409 PENDING_APPROVAL`
- Assignment is still allowed (so someone can be assigned to handle it after approval)
- Comments are still allowed
- The UI status form will show the error if attempted

This ensures the approval gate is meaningful and cannot be bypassed.

## Expiry

The worker checks for expired approvals every 60 seconds. Approvals that pass their `expiresAt` timestamp are automatically marked EXPIRED and their linked job is SKIPPED. Once expired, the ticket is unlocked and status changes are allowed again.
