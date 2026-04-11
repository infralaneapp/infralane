# Infralane

**Structured ops. Automated execution.** — structured intake, automated triage, approval workflows, and full audit trail. Built for DevOps and IT operations teams.

Infralane is not a generic help desk. It's an ops control center where ticket creation triggers automation rules, approvals gate sensitive actions, and every state change is traceable.

## Key Features

- **Structured ticket intake** — Typed requests (access, deployment, incident, infrastructure) with custom field schemas
- **Automation engine** — Rules that trigger on ticket events, evaluate conditions, and execute actions (assign, change status, notify, escalate, webhook)
- **Approval workflows** — Gate automation behind human approval with designated approvers and ticket locking
- **Three-tier roles** — Requester, Operator, Admin with granular permissions
- **SLA tracking** — Configurable response/resolution thresholds with breach detection and auto-escalation
- **Slack integration** — OAuth login, DM notifications, interactive approval buttons
- **Knowledge base** — Self-service articles linked to ticket types
- **Full audit trail** — Every mutation logged, automation job lifecycle events, settings change history

## Quick Start

```bash
# Clone and start
git clone <repo-url> infralane && cd infralane
docker compose up -d

# App: http://localhost:3000
# Login: alex.hart@infralane.local / password123 (Admin)
```

See [Getting Started](./docs/getting-started.md) for full setup instructions.

## Demo Accounts

| Email | Role |
|-------|------|
| alex.hart@infralane.local | Admin |
| nina.cho@infralane.local | Admin |
| jordan.ellis@infralane.local | Operator |
| samir.khan@infralane.local | Requester |
| leila.morgan@infralane.local | Requester |

Password for all: `password123`

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 16
- **Auth**: HMAC-SHA256 session cookies + Slack OAuth
- **Worker**: Standalone Node.js process with PostgreSQL-backed job queue
- **Real-time**: Server-Sent Events (SSE)

## Architecture

```
Browser → Next.js (pages + API routes) → Prisma → PostgreSQL
                                          ↓
                                   Automation Worker
                                   (5s job poll + 60s SLA check)
```

The automation worker runs as a separate process, claiming jobs atomically with `SELECT FOR UPDATE SKIP LOCKED`. See [Architecture](./docs/architecture.md).

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./docs/architecture.md) | System design, data model, worker |
| [Getting Started](./docs/getting-started.md) | Setup, env vars, Docker |
| [Roles & Permissions](./docs/roles-and-permissions.md) | Three-tier role system |
| [Automation Engine](./docs/automation-engine.md) | Triggers, conditions, actions |
| [Approval Workflows](./docs/approval-workflows.md) | Approval model and lifecycle |
| [Slack Integration](./docs/slack-integration.md) | OAuth, DMs, interactive approvals |
| [API Reference](./docs/api-reference.md) | All REST endpoints |
| [Built-in Automations](./docs/built-in-automations.md) | Default rules and templates |

## Development

```bash
npm run dev          # Start Next.js dev server
npm run worker       # Start standalone automation worker
npm run build        # Production build
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
npm run prisma:seed  # Re-seed demo data
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md) for reporting vulnerabilities.

## License

[MIT](./LICENSE)
