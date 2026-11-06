# Security

Bastion is a defensive product. This file describes how this application handles its own security, and what it will not do.

## Product boundaries

- The scanner sends HEAD and GET only, to web ports 80, 443, 8080, and 8443.
- Targets are refused when they are loopback, private, link-local, multicast, documentation, or cloud-metadata addresses, or when DNS for the hostname returns any such address. Redirects are checked again. Requests are pinned to the resolved public address.
- Timeouts, redirect limits, and response-size limits are enforced. Bodies of sensitive-path probes are not stored. A `.git/HEAD` body is kept only when it matches a ref line or a 40-character hex object name.
- There is no exploit payload, no credential stuffing, no brute force, and no request that is intended to modify data on the target.
- An ownership attestation is required on every scan and is checked on the server.
- Dependency review uses the public OSV.dev API. It does not execute package code.
- The public exposure check at `/exposure` looks up breach metadata. It does not request or display leaked passwords, message contents, or lists of employee addresses.
- An email submitted to `POST /api/exposure/email` is forwarded to the XposedOrNot breach-analytics API and, only when `HIBP_API_KEY` is set, to Have I Been Pwned. The address is not stored in the database and is not written to application logs. Rate-limit keys are SHA-256 hashes (peppered with `AUTH_SECRET`), not the address itself.
- Password checks hash in the browser. The browser sends the first five characters of a SHA-1 digest to `https://api.pwnedpasswords.com/range/`. The content security policy allows that host on `connect-src` and no other third party. `POST /api/exposure/password-range` is the fallback and accepts only that prefix.
- Domain catalog lookups use the public XposedOrNot breach list. The API that returns addresses for a verified domain is not called. Optional passive hints use the same scanner, attestation, and address refusals as an authenticated scan, with a tighter per-network limit. Those checks are not stored as scan rows.
- The public demo account cannot start a scan, create a property, append ledger events, or schedule a re-scan. Its published ingest key is rejected. Passive exposure hints also require a signed-in workspace that is not the demo.
- A password check hashes in the browser. The server route `POST /api/exposure/password-range` accepts only a 5-character prefix and refuses any other field. It is the fallback when the browser cannot reach `https://api.pwnedpasswords.com`.
- Feed and breach fetches are limited to an allowlist of https hosts. Threat and advisory responses are cached in memory and in the database so a new serverless instance can serve the last successful fetch.
- The public page at `/threats` reads machine-readable advisories on the server: CISA Known Exploited Vulnerabilities, NCSC UK report RSS, Cisco and Microsoft security RSS, GitHub Security Advisories, the ENISA EUVD API, and a seven-day NVD window. CERT-In is requested; if the response is not a feed, the page says so and does not add a record. Records are not written to the database and are not added unless they appear in a successful response. Advice that is not copied from a required-action field is labelled general guidance.

## This application

- Passwords are hashed with bcrypt (cost 12). Sessions are random tokens stored only as SHA-256 hashes, in an HttpOnly, SameSite=Lax cookie.
- Ingest keys are random, shown once, and stored only as a hash. The demo key is a public sample and is labelled as such.
- Prompt text submitted to the guardrail API is hashed in memory. The stored row keeps the hash and the rule findings. Matched secrets are not copied into the finding text.
- The traffic and agent logs are hash-chained per property. Verification recomputes the payload from the visible columns. This detects an edited row. It does not stop an administrator who can rewrite the chain. Export JSON to storage with separate access if you need that property.
- Login attempts are rate-limited per email. Scans and ingest are rate-limited. The counters are rows in the database, so a new serverless instance does not reset them. An in-process limiter still applies inside one instance.
- `npm audit` is clear of the PostCSS, Vitest, and Prisma advisories that had a patched release. `braces` 3.0.3 remains through the ESLint toolchain. That package's newest release is the affected one, and it is used while linting, not in the production server. Downgrading `eslint-config-next` to the version audit suggests would not match this Next.js release.
- Response headers on this app include `X-Frame-Options: DENY`, `nosniff`, a referrer policy, a permissions policy, and a content security policy. The script policy allows inline scripts because this Next.js build needs them. `connect-src` allows this origin and `https://api.pwnedpasswords.com` so the password check can run in the browser. Treat the inline-script allowance as a known MVP limit, not as the header we recommend for your site. The scanner's own fix snippets do not include `'unsafe-inline'`.

## Reporting a problem

This repository is a product workspace, not a public bug-bounty program. `/.well-known/security.txt` points at the security page. If `NEXT_PUBLIC_SECURITY_CONTACT` is an email address, that file also lists it. Do not test a defect against systems you do not own.

## Data

Local development stores data in SQLite (`prisma/bastion.db`, from `DATABASE_URL=file:./bastion.db`, resolved relative to the Prisma schema). That file is gitignored and is not encrypted by the application. Vercel uses hosted Postgres. The app reads the pooled `DATABASE_URL` and starts when `DIRECT_URL` is absent. Migrations use `DATABASE_URL_UNPOOLED` (Neon) unless `DIRECT_URL` is set. Set `AUTH_SECRET` to at least 32 random characters before the deployment can sign a session. Do not point the scanner or the ledger at production customer data until that database's access and backups are decided.
