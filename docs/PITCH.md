# Bastion — readiness note

This is an honest one-page summary for someone deciding whether to look at Bastion. It is not a proposal, a certification, or a customer list. The same text is on the public page at `/pitch`.

© 2026 Flyhigh. All rights reserved.

## The problem

Teams are asked which AI crawlers touched a site they operate, whether that host has ordinary header and TLS gaps, and whether an address or a password shows up in a public breach catalog. Those answers usually live in separate tools. Bastion keeps a passive read, a crawler and agent ledger, and a short executive brief in one workspace, and it refuses a scan of an address it should not touch.

## What actually works today

- Passive scan after an ownership attestation: headers, TLS, cookies, CORS, mixed content, `robots.txt`, `ai.txt`, and well-known sensitive paths. Fixes are nginx, Apache, and Express snippets. Private, loopback, link-local, and metadata targets are refused. DNS is checked and the connection is pinned.
- Dependency review of a `package.json` or `requirements.txt` against OSV.dev. Ranges are labelled. Unpinned names are not given an invented CVE.
- Hash-chained ledger of requests, classified from published AI crawler user-agent tokens. Tokens can be spoofed, and the product says so.
- Agent tool-call log. The prompt is hashed and dropped. Indicator rules map to the OWASP Top 10 for LLM Applications 2025. A saved policy can return allow, flag, or deny for a tool name, a hostname, a prompt-injection indicator, or a completed high-impact tool. The caller enforces deny. Bastion does not run inside the agent.
- Owner, admin, and viewer roles. Invitation links last seven days. Admin actions are written to an audit log on the team page.
- Workspace API keys with scopes `scans:read` and `scans:write`. The document is `/api/openapi.json` and `/docs/api`. Property ingest keys remain separate and still authenticate the ledger and agent log.
- HTTPS webhooks on `scan.completed`, signed with HMAC-SHA256. Private addresses are refused and redirects are not followed. The connection is not pinned the way a scan is.
- A PayPal payment link is checkout only. The buyer submits a transaction id. An operator listed in `ADMIN_EMAILS` approves or rejects it at `/app/admin`. Approval sets the workspace plan to Team. There is no PayPal webhook.
- In-app notifications for finished scans. Email uses Resend only when `RESEND_API_KEY` and `RESEND_FROM` are set, and only for a Team workspace.
- OIDC sign-in for Google (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) or a generic issuer (`OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`). The ID token is checked against the provider JWKS. The login page says when SSO is not configured.
- A security-review form at `/enterprise`, stored for the operator. A walkthrough at `/demo`. A whitepaper at `/docs/security`. A changelog at `/changelog`. `/status` reports a database query plus whether the scheduler, email, and SSO are configured.
- Policy export: `robots.txt`, an `ai.txt` draft, and Express middleware. Only the middleware enforces a deny on a process you run.
- HTML and PDF executive brief. The score is a heuristic (critical 15, high 8, medium 4, low 1, info 0, from a start of 100). The brief prints its limits.
- Public exposure check at `/exposure`. Email and domain names go to XposedOrNot and are not stored. Have I Been Pwned is used only when `HIBP_API_KEY` is set. A password is hashed in the browser; only a 5-character SHA-1 prefix is sent, with a same-origin fallback that accepts that prefix and nothing else.
- Public global-attacks page at `/threats`, filled from CISA KEV, NCSC UK, Cisco, Microsoft, GitHub Security Advisories, ENISA EUVD, and a seven-day NVD window. Every card has a source link and a date. General guidance is labelled as general guidance. CERT-In is requested and shown as unavailable when the response is not a feed.

The Northwind Labs workspace is a seeded fixture. Its password is published (`Bastion-Demo-2026`). It cannot scan, create a property, or append events. Its score is not a customer result.

## Architecture

Next.js (App Router) and TypeScript on Vercel. Production data is Postgres. A local checkout uses SQLite. Sessions are random tokens stored only as a peppered SHA-256 hash, in an HttpOnly, SameSite=Lax cookie that is Secure on Vercel. Account passwords are bcrypt hashes. Feed snapshots are stored so a cold start can serve the last successful fetch. Rate limits are rows in the database.

## Security posture

Origin checks on state-changing routes. Rate limits on sign-in, sign-up, scans, exposure lookups, ingest, property creation, policy saves, and tool-call logs. SSRF denylist and DNS pinning on the scanner. Outbound feed and breach hosts are an HTTPS allowlist. The content-security policy allows inline scripts because this Next.js build needs them. `object-src` is `none`. There is no bug-bounty program. `/.well-known/security.txt` points at `/security`. A disclosure email is shown only when `NEXT_PUBLIC_SECURITY_CONTACT` is an email. `NEXT_PUBLIC_ENTERPRISE_CONTACT` is a separate optional email or https URL on `/pitch`.

## Roadmap

No dates. These are not done:

- SAML and SCIM. OIDC is the sign-in that exists, and only when the variables are set.
- A PayPal webhook. Plan changes are a manual approval.
- Setting `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, and `ADMIN_EMAILS` on a deployment that should use them. The code does nothing useful with the empty values.
- An automated retention job and a formal audit. The whitepaper says records stay until someone deletes them.

## Enterprise contact

Set `NEXT_PUBLIC_ENTERPRISE_CONTACT` to an email or an https URL. When it is unset, the pitch page says no enterprise address is published and points at `/security`. Do not invent a mailbox in the product.

## What is not yet there

- No SOC 2, ISO 27001, or other certification.
- No penetration-test letter.
- No customers, logos, testimonials, revenue, or uptime number.
- No SAML or SCIM. OIDC is off until the operator sets it.
- No service-level agreement.
- No email unless Resend is configured, and then only for Team workspaces.
- Paying does not change the plan until an operator approves the claim.
- Weekly re-scans do not run until the workspace is Team and the cron secret is set.
- No automated retention job.
- Webhook delivery does not pin DNS the way the scanner does.
- The CERT-In feed is unavailable.
- The ESLint toolchain still depends on `braces` 3.0.3. That advisory is in the linter, not in the production server, and the newest braces release is the affected one.
