# Changelog

All notable changes to Infralane will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Three-tier role system (Requester, Operator, Admin) with centralized permissions
- Automation engine with triggers, conditions, actions, and worker
- Approval workflows with designated approvers and ticket locking
- Slack integration (OAuth login, DM notifications, interactive approvals)
- Email notification fan-out (SMTP)
- Built-in automation rules (7 rules) and templates (3 templates)
- SLA tracking with configurable thresholds and breach detection
- Escalation policies with time-based notification steps
- Knowledge base with article management and search
- Dashboard with automation health metrics and date range filters
- Canned responses / quick replies for operators
- CSV ticket import
- Webhook endpoints with domain allowlisting
- Settings audit log
- Requester satisfaction ratings
- Full-text search across tickets, comments, and fields
- Real-time notifications via SSE
- Mobile-responsive UI

### Security
- Slack request signature verification (HMAC-SHA256)
- Designated approver enforcement on approval workflows
- Rate limiting on login and registration endpoints
- Secret masking in API responses
- Session secret fail-fast in production
- Registration duplicate-email race condition handling
- Automation dedup concurrency safety via unique constraint
