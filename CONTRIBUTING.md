# Contributing to Infralane

Thank you for your interest in contributing!

## Development Setup

1. Clone the repository
2. Run `docker compose up -d` for a working local install
3. App at http://localhost:3000 (login with demo accounts — see docs/getting-started.md)

## Project Structure

- `app/` — Next.js pages and API routes
- `components/` — React components
- `modules/` — Domain logic (tickets, automation, approvals, notifications)
- `lib/` — Shared utilities (auth, db, http, sla, permissions)
- `prisma/` — Database schema and migrations

## Development Workflow

1. Create a branch from `main`
2. Make changes
3. Run `npx next build` to verify the build passes
4. Run `npm run typecheck` for type checking
5. Submit a pull request

## Coding Standards

- TypeScript strict mode
- Use existing patterns: `apiSuccess/apiError` for API responses, `hasPermission/isStaffRole` for auth
- Prisma for all database access — no raw SQL except in the worker's job claiming query
- Automation executors must use Prisma directly (not service functions) to prevent cascade triggers

## Database Changes

- Use `npx prisma migrate dev --name <description>` to create new migrations
- Never use `prisma db push` in production
- Run `npx prisma generate` after schema changes

## Commit Messages

Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`

## Need Help?

Open an issue or start a discussion.
