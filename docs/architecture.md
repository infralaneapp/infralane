# Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React, TypeScript |
| Styling | Tailwind CSS, shadcn/ui components |
| Backend | Next.js API Routes (serverless functions) |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Auth | HMAC-SHA256 signed session cookies (8h expiry) + Slack OAuth |
| Real-time | Server-Sent Events (SSE) |
| Worker | In-process poller (dev) or standalone Node process (production) |
| Container | Docker Compose (app + worker + PostgreSQL) |

## Directory Structure

```
infralane/
├── app/
│   ├── (app)/              # Authenticated pages (tickets, dashboard, settings, etc.)
│   ├── api/                # REST API routes
│   ├── login/              # Login page
│   └── register/           # Registration page
├── components/             # React components (UI, tickets, dashboard, etc.)
├── lib/
│   ├── auth/               # Session, password hashing, permissions, schemas
│   ├── db/                 # Prisma client singleton
│   ├── http.ts             # API response helpers (apiSuccess, apiError, handleApiError)
│   ├── errors.ts           # AppError class
│   ├── formatters.ts       # Date/time formatting utilities
│   └── sse.ts              # SSE client manager
├── modules/
│   ├── automation/         # Automation engine (triggers, conditions, executors, worker)
│   │   └── adapters/       # External integration adapters (Slack, webhook)
│   ├── approvals/          # Approval workflow service
│   ├── comments/           # Comment service
│   ├── notifications/      # Notification service (in-app + Slack DM fan-out)
│   └── tickets/            # Ticket CRUD, serializers, schemas, stats
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed data (users, ticket types, automation rules, templates)
├── worker.ts               # Standalone automation worker entry point
├── instrumentation.ts      # Next.js server instrumentation (embedded worker startup)
└── compose.yaml            # Docker Compose (app + worker + PostgreSQL)
```

## Data Model (Key Entities)

```
User (REQUESTER | OPERATOR | ADMIN)
  ├── requestedTickets[]
  ├── assignedTickets[]
  ├── notifications[]
  ├── approvalsGiven[]
  └── slackUserId?

Ticket
  ├── ticketType → TicketType (access, deployment, incident, infra)
  ├── fields[] → TicketField (structured key-value data)
  ├── comments[] → TicketComment
  ├── activities[] → TicketActivity (audit trail)
  ├── tags[] → Tag (via TicketTag)
  ├── attachments[] → Attachment
  ├── relations[] → TicketRelation (RELATED, BLOCKS, DUPLICATE)
  ├── automationJobs[] → AutomationJob
  ├── approvalRequests[] → ApprovalRequest
  └── SLA timestamps (firstResponseAt, resolvedAt, closedAt)

AutomationRule
  ├── trigger (TICKET_CREATED, STATUS_CHANGED, SLA_BREACHED, etc.)
  ├── conditions (JSON, AND logic)
  ├── action (ASSIGN_TO, CHANGE_STATUS, SLACK_NOTIFY, WEBHOOK, etc.)
  ├── requiresApproval?
  └── jobs[] → AutomationJob
        ├── events[] → AutomationJobEvent (lifecycle audit)
        └── approvalRequest? → ApprovalRequest

IntegrationConfig (provider: "slack" | "webhook")
WebhookEndpoint (url, headers, payloadTemplate, allowedDomains)
```

## Request Flow

```
Browser → Next.js App Router
  ├── Server Components (pages) → Prisma → PostgreSQL
  ├── API Routes → Service Layer → Prisma → PostgreSQL
  └── SSE endpoint → In-memory client registry → Push notifications

Ticket Mutation → emitTrigger() → Evaluate rules → Create AutomationJob
  └── Worker (5s poll) → Claim jobs → Execute actions → Write results

SLA Checker (60s poll) → Find breached tickets → Emit SLA_BREACHED triggers
Approval Expiry (60s poll) → Expire stale PENDING approvals
```

## Worker Architecture

The automation worker can run in two modes:

1. **Embedded** (default for dev): Starts inside the Next.js process via `instrumentation.ts`. Uses `globalThis` singleton to survive hot-reload.

2. **Standalone** (recommended for production): Runs as a separate Node.js process via `npx tsx worker.ts`. Set `INFRALANE_WORKER_MODE=external` on the app to disable the embedded worker.

Both modes use the same job processing logic:
- Atomic job claiming via `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING *`
- Exponential backoff on failure (5s base, 5min max, with jitter)
- Dead-letter after exhausting max attempts (default 3)
- Lifecycle events logged to `AutomationJobEvent` table

## Cascade Prevention

Automation executors operate directly at the Prisma level (not through service functions). This means automation actions never re-trigger other automation rules, preventing infinite cascades.
