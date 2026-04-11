# Getting Started

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development outside Docker)
- Git

## Quick Start with Docker

```bash
# Clone the repository
git clone <repo-url> infralane && cd infralane

# Start all services (app + worker + PostgreSQL)
docker compose up -d

# The start script automatically runs:
# - npm install
# - prisma generate
# - prisma db push
# - prisma db seed
# - next dev

# App is available at http://localhost:3000
```

## Default Accounts

All seeded accounts use password `password123`:

| Email | Role | Purpose |
|-------|------|---------|
| alex.hart@infralane.local | ADMIN | Full access — settings, automations, team |
| nina.cho@infralane.local | ADMIN | Full access |
| jordan.ellis@infralane.local | OPERATOR | Ticket operations, approvals, reports |
| samir.khan@infralane.local | REQUESTER | Can submit and view own tickets |
| leila.morgan@infralane.local | REQUESTER | Can submit and view own tickets |

## Local Development (without Docker)

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed sample data
npx prisma db seed

# Start dev server
npm run dev

# (Optional) Start standalone worker
npm run worker
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `INFRALANE_SESSION_SECRET` | Yes (prod) | 32+ char secret for session signing. Falls back to dev default |
| `INFRALANE_BASE_URL` | No | Base URL for links in notifications (default: `http://localhost:3000`) |
| `INFRALANE_WORKER_MODE` | No | Set to `external` to disable embedded worker (when running standalone) |
| `AUTOMATION_WORKER_SECRET` | No | Bearer token for the `/api/automation/process` manual trigger endpoint |
| `SLACK_CLIENT_ID` | No | Slack app client ID for OAuth login (see [Slack Integration](./slack-integration.md)) |
| `SLACK_CLIENT_SECRET` | No | Slack app client secret |

## Docker Compose Services

| Service | Port | Description |
|---------|------|-------------|
| `app` | 3000 | Next.js application (with embedded worker in dev) |
| `worker` | — | Standalone automation worker |
| `db` | 5432 | PostgreSQL 16 |

## Useful Commands

```bash
# View app logs
docker compose logs app -f

# View worker logs
docker compose logs worker -f

# Re-seed the database
docker compose exec app npx prisma db seed

# Push schema changes
docker compose exec app npx prisma db push

# Run build check
npx next build

# Access PostgreSQL
docker compose exec db psql -U postgres -d infralane
```
