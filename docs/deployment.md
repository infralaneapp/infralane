# Deployment Guide

This guide covers deploying Infralane to production environments.

## Production Docker Compose

The production compose setup separates the web application from the automation worker:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://infralane:${DB_PASSWORD}@postgres:5432/infralane
      - INFRALANE_SESSION_SECRET=${SESSION_SECRET}
      - NODE_ENV=production
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      replicas: 2

  worker:
    build: .
    command: ["node", "--import", "tsx", "worker.ts"]
    environment:
      - DATABASE_URL=postgresql://infralane:${DB_PASSWORD}@postgres:5432/infralane
      - NODE_ENV=production
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=infralane
      - POSTGRES_USER=infralane
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U infralane"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
```

The `app` service runs the Next.js application (pages + API routes). The `worker` service runs the standalone automation worker that polls for jobs and checks SLA breaches.

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `INFRALANE_SESSION_SECRET` | HMAC-SHA256 session signing key (min 32 characters) |
| `NODE_ENV` | Set to `production` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `SLACK_CLIENT_ID` | Slack OAuth app client ID | _(disabled)_ |
| `SLACK_CLIENT_SECRET` | Slack OAuth app client secret | _(disabled)_ |
| `SLACK_BOT_TOKEN` | Slack bot token for DM notifications | _(disabled)_ |
| `SLACK_SIGNING_SECRET` | Slack request signing secret for interactive messages | _(disabled)_ |
| `NEXT_PUBLIC_APP_URL` | Public URL of the application | `http://localhost:3000` |

## Database Migrations

Always use `prisma migrate deploy` in production -- never `prisma db push`:

```bash
# Run migrations before starting the app
npx prisma migrate deploy
```

`prisma migrate deploy` applies pending migrations in order and fails if there are drift issues. `prisma db push` can silently drop data when reconciling schema differences.

In Docker, run migrations as an init step:

```bash
docker compose run --rm app npx prisma migrate deploy
```

Or add a migration service to your compose file:

```yaml
services:
  migrate:
    build: .
    command: ["npx", "prisma", "migrate", "deploy"]
    environment:
      - DATABASE_URL=postgresql://infralane:${DB_PASSWORD}@postgres:5432/infralane
    depends_on:
      postgres:
        condition: service_healthy
```

## Reverse Proxy

Infralane should sit behind a reverse proxy that handles TLS termination. Example Caddy configuration:

```
infralane.example.com {
    reverse_proxy app:3000
}
```

Example nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name infralane.example.com;

    ssl_certificate /etc/ssl/certs/infralane.pem;
    ssl_certificate_key /etc/ssl/private/infralane.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE connections need longer timeouts
    location /api/sse {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}
```

Key points:
- Disable proxy buffering for the SSE endpoint (`/api/sse`) so events stream immediately
- Set a long read timeout for SSE connections
- Forward `X-Forwarded-Proto` so the app knows it's behind TLS

## Secret Management

Sensitive values that must be protected:

- `DATABASE_URL` -- contains database credentials
- `INFRALANE_SESSION_SECRET` -- session signing key; rotating this invalidates all active sessions
- `SLACK_CLIENT_SECRET` / `SLACK_BOT_TOKEN` / `SLACK_SIGNING_SECRET` -- Slack integration credentials

Recommendations:

- Use Docker secrets or a secrets manager (Vault, AWS Secrets Manager, etc.)
- Never commit secrets to version control
- Use `.env` files only for local development, never in production images
- Rotate `INFRALANE_SESSION_SECRET` periodically; be aware this logs out all users
- Generate secrets with sufficient entropy: `openssl rand -base64 48`

## Scaling

### Application Instances

The Next.js app is stateless -- you can run multiple instances behind a load balancer:

```yaml
deploy:
  replicas: 3
```

Session cookies are HMAC-signed (not server-stored), so any instance can validate them. No sticky sessions required.

### Worker Instances

The automation worker uses `SELECT FOR UPDATE SKIP LOCKED` for job claiming, which means multiple worker instances are safe -- each job is processed by exactly one worker. However, for most deployments a single worker instance is sufficient.

```yaml
worker:
  deploy:
    replicas: 1  # Single instance is usually sufficient
```

If you run multiple workers:
- Job deduplication keys prevent duplicate processing of identical triggers
- SLA breach checks are idempotent (re-checking an already-breached SLA is a no-op)
- Each worker polls independently on a 5-second interval

### Database

PostgreSQL is the single stateful component. For production:
- Use a managed PostgreSQL service (RDS, Cloud SQL, etc.) or a properly managed instance
- Enable connection pooling (PgBouncer) if running many app replicas
- Set `connection_limit` in the Prisma connection string if needed: `?connection_limit=10`

## Monitoring

### Health Checks

The application exposes standard Next.js health at the root. For deeper checks:

```bash
# Basic app health
curl -f http://localhost:3000/api/health

# Database connectivity (via any authenticated API call)
curl -f http://localhost:3000/api/tickets
```

### Automation Metrics

The automation metrics endpoint provides job processing statistics:

```bash
curl http://localhost:3000/api/automation/metrics
```

Returns counts of pending, running, completed, and failed jobs, plus average processing times. Use this to monitor worker health and detect backlogs.

### Key Metrics to Monitor

- **Job queue depth** -- pending jobs should stay near zero; growing backlog indicates worker issues
- **Job failure rate** -- repeated failures on the same rule suggest misconfiguration
- **SLA breach count** -- track via the reports API (`/api/reports/sla`)
- **Response times** -- standard HTTP metrics from your reverse proxy
- **Database connections** -- monitor active connections vs. pool limit
- **Worker process health** -- ensure the worker process stays running (use process manager or container restart policy)

### Logging

Both the app and worker log to stdout. In production:
- Use a log aggregation service (Datadog, Loki, CloudWatch, etc.)
- Set `NODE_ENV=production` for JSON-formatted logs
- Monitor for `ERROR` and `WARN` level entries

## Backup Strategy

### PostgreSQL Backups

Infralane stores all state in PostgreSQL. A robust backup strategy is critical.

**Automated daily backups:**

```bash
#!/bin/bash
# backup.sh -- run via cron daily
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups/infralane

pg_dump -Fc -h localhost -U infralane infralane > "${BACKUP_DIR}/infralane_${TIMESTAMP}.dump"

# Retain last 30 days
find "${BACKUP_DIR}" -name "*.dump" -mtime +30 -delete
```

**Restore from backup:**

```bash
pg_restore -h localhost -U infralane -d infralane --clean --if-exists infralane_20260410_020000.dump
```

**Recommendations:**

- Use `pg_dump -Fc` (custom format) for compressed, flexible restores
- Store backups off-host (S3, GCS, or a separate backup server)
- Test restores regularly -- an untested backup is not a backup
- For managed PostgreSQL (RDS, Cloud SQL), use the provider's automated backup with point-in-time recovery
- Consider WAL archiving for continuous backup with minimal data loss (< 5 minutes RPO)

**What to back up:**

- The PostgreSQL database (all application state, tickets, automation rules, audit log)
- Environment configuration (`.env` or secrets manager config)
- The `prisma/migrations` directory is in version control and does not need separate backup
