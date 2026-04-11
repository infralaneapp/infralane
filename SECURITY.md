# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in Infralane, please report it responsibly:

1. **Do not** open a public issue
2. use GitHub's private vulnerability reporting
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix or mitigation**: Within 30 days for critical issues

## Scope

In scope:
- Authentication and session management
- Authorization and role-based access control
- Automation engine (trigger, execute, dedup)
- Approval workflow integrity
- Data exposure through API endpoints
- Slack/webhook integration security

Out of scope:
- Issues in dependencies (report to the dependency maintainer)
- Self-hosted deployment misconfigurations
- Social engineering

## Safe Harbor

We will not pursue legal action against researchers who:
- Report vulnerabilities following this policy
- Do not access or modify other users' data
- Do not perform denial of service attacks
- Allow reasonable time for fixes before disclosure
