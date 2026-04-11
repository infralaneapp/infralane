# Open-Source Readiness Checklist

Tracking what needs to be done before Infralane can be released as a public open-source project.

---

## Critical Before Public Release

- [x] Fix Slack interaction verification with real X-Slack-Signature / timestamp validation.
- [x] Enforce designated approvers in approval workflows instead of allowing any staff user to decide.
- [x] Fix operator assignment so OPERATOR users can actually be assigned tickets everywhere.
- [x] Make automation dedup concurrency-safe with a database-backed uniqueness strategy.
- [x] Remove insecure session-secret fallback outside dev; fail fast if secrets are missing in production.
- [x] Catch unique-email registration races and return 409, not 500.
- [x] Review settings APIs so secrets and integration config are not overexposed in responses or logs.
- [x] Add basic auth hardening: rate limiting or lockout on login, secure cookies, CSRF review for sensitive mutations.
- [x] Replace `prisma db push` in documented release flow with real Prisma migrations.

---

## Reliability and Correctness

- [x] Add automated tests for auth, RBAC, approvals, automation retries, dedup, dead-letter, and ticket lifecycle.
- [x] Add startup env validation for all required variables.
- [x] Add integration tests for Slack/webhook adapters with mocked providers.
- [x] Ensure worker behavior is safe with multiple instances.
- [x] Make automation job history complete enough to debug production failures.
- [x] Confirm all counts, search, reports, and dashboards respect role-based visibility.

---

## Developer Experience

- [x] Provide a clean `.env.example`.
- [x] Make `docker compose up --build` enough for a working local install.
- [x] Seed demo users, ticket types, templates, and built-in automation rules.
- [x] Add a make/npm script set for common tasks: dev, build, test, worker, seed.
- [x] Document local Slack/webhook setup without requiring real production credentials.

---

## Documentation

- [x] Write a strong root `README.md` with product positioning, quickstart, and feature list.
- [x] Document architecture: app, worker, DB, automation engine, approvals, permissions.
- [x] Document the data model and lifecycle clearly.
- [x] Document how automation rules work, including limits and safety model.
- [x] Add API docs for the main routes.
- [x] Add deployment docs for Docker Compose and production hosting.

---

## Open Source Hygiene

- [x] Add a license (MIT).
- [x] Add `CONTRIBUTING.md`.
- [x] Add `SECURITY.md` with responsible disclosure instructions.
- [x] Add issue templates and a PR template.
- [x] Add a changelog or release notes process.
- [x] Remove any hardcoded local/dev secrets from committed config.

---

## CI/CD

- [x] Add CI for build, typecheck, lint, Prisma validation, and tests.
- [x] Add dependency vulnerability scanning (Dependabot + npm audit in CI).
- [x] Add secret scanning (GitHub auto-enables on public repos, Dependabot configured).
- [x] Add a release workflow for tagged versions and Docker image publishing.

---

## Product Quality

- [x] Keep the positioning sharp: "Ops automation service desk," not generic help desk.
- [x] Ensure the default demo shows the standout features: approvals, automation, audit trail, structured intake.
- [x] Ship a polished happy path: create request → triage → approve → automate → audit.
- [x] Make failure states readable for operators, not just developers.

---

## Nice to Have Before v1.0

- [ ] Demo video or GIF in the README.
- [ ] Hosted demo or public sandbox.
- [x] Import/export for automation rules and templates.
- [x] Metrics/health dashboard for automation runs.
- [ ] Versioned API docs.

---

## Status Summary

| Category | Done | Total |
|----------|------|-------|
| Critical security | 9 | 9 |
| Reliability | 6 | 6 |
| Developer experience | 5 | 5 |
| Documentation | 6 | 6 |
| Open source hygiene | 6 | 6 |
| CI/CD | 4 | 4 |
| Product quality | 4 | 4 |
| Nice to have | 2 | 5 |
| **Total** | **42** | **45** |

The 3 remaining items (demo video, hosted demo, versioned API docs) require external tooling and hosting — they can't be implemented in code alone.
