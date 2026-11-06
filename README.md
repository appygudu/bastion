# Bastion

Defensive control plane for the websites and agents you own. Bastion runs passive checks, reviews a dependency manifest against OSV.dev, records AI crawlers and agent tool calls in a hash-chained ledger, and prints an executive brief.

© 2026 Flyhigh. All rights reserved. See [LICENSE](LICENSE) and [ACCEPTABLE_USE.md](ACCEPTABLE_USE.md). Use it only on systems you own or are authorized to assess.

## Run locally

```bash
cp .env.example .env
npm install
npm test
npm run dev
```

Open http://127.0.0.1:4317.

Demo workspace (seeded, labelled demo, not live telemetry):

- Email: `demo@bastion.example`
- Password: `Bastion-Demo-2026`
- Demo ingest key: `bsk_demo_northwind_public_sample`

`npm run build` then `npm start` serves the production build on the same port.

## What you can do

- **Scanner.** Attest ownership, then review headers, TLS, cookies, CORS, mixed content, `robots.txt`, `ai.txt`, and well-known sensitive paths. Fixes are nginx, Apache, and Express snippets. Private, loopback, link-local, and metadata addresses are refused.
- **Dependencies.** Paste `package.json` or `requirements.txt`. Pinned versions are queried at `https://api.osv.dev/v1/querybatch`.
- **Ledger.** `sdk/node/bastion.js` and `POST /api/v1/traffic` record requests. Known AI crawlers are classified from published user-agent tokens. Export CSV or JSON. The hash chain detects an edited row.
- **Policies.** Allow or deny per agent and copy `robots.txt`, an `ai.txt` draft, and middleware. The files are preferences. The middleware is what enforces them on a process you run.
- **Agents.** `POST /api/v1/agent-events` hashes the prompt, drops the text, and maps indicator rules to the OWASP LLM Top 10 (2025).
- **Reports.** Generate an HTML brief or a PDF. The index is a heuristic and says so.
- **Exposure check.** Public page at `/exposure`. Email and domain names are looked up in the XposedOrNot catalog. A password is checked in the browser against the Pwned Passwords range API. Recent items come from the CISA Known Exploited Vulnerabilities feed and from OSV.dev. Have I Been Pwned is optional.
- **Global attacks.** Public page at `/threats`. Records are fetched server-side from CISA KEV, NCSC UK, Cisco, Microsoft, GitHub Security Advisories, ENISA EUVD, and a short NVD window. CERT-In is requested and shown as unavailable when it does not return a feed. Every card has a source link and a date. User advice that is not copied from a required-action field is labelled general guidance. The last successful fetch is stored in the database.
- **Pricing, privacy, terms, about, status, and readiness.** Public pages. The Team payment button stays on Coming soon until `NEXT_PUBLIC_PAYMENT_LINK_URL` is an https URL. A workspace becomes Team only after an operator listed in `ADMIN_EMAILS` approves a PayPal claim. Weekly re-scans run for Team workspaces when `CRON_SECRET` is set. Email sends for Team workspaces when `RESEND_API_KEY` and `RESEND_FROM` are set. OIDC appears on the login page when Google or generic OIDC variables are set. SAML is not implemented. `/pitch` and [docs/PITCH.md](docs/PITCH.md) say what works and what does not.

Research notes and sources: [docs/RESEARCH.md](docs/RESEARCH.md). Product behavior: [docs](http://127.0.0.1:4317/docs) once the server is running, and the in-app `/docs` page.

## Deploy to Vercel

Vercel functions have an ephemeral disk. Production uses hosted Postgres. Local `npm run dev` still uses SQLite.

1. Attach Postgres. The Neon integration on Vercel sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct). It does not set `DIRECT_URL`.
2. Create a Vercel project from this repo. Framework preset: Next.js. Node.js 22 (20 also builds). `package.json` sets `"engines": { "node": "22.x" }`. `.node-version` is `22`.
3. Set these environment variables for Production, Preview, and Build. The build runs `prisma migrate deploy`, so the database must be reachable from Vercel at build time.

| Variable | Required | What to put |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled Postgres URL. Neon sets this. The host contains `-pooler`. |
| `DATABASE_URL_UNPOOLED` | Set by Neon | Direct URL. The build uses it for migrations when `DIRECT_URL` is unset. |
| `AUTH_SECRET` | Yes | At least 32 random characters. `openssl rand -hex 32`. Sessions and ingest keys are hashed with this pepper. |
| `APP_URL` | Yes on Vercel | Public origin, for example `https://your-project.vercel.app`. |
| `COOKIE_SECURE` | Yes on Vercel | `true`. When `VERCEL=1`, the cookie is Secure unless this is exactly `false`. |
| `DIRECT_URL` | No | Optional override for migrations. When it is unset, `scripts/vercel-build.mjs` sets it to `DATABASE_URL_UNPOOLED`, then `DATABASE_URL`, then `POSTGRES_URL_NON_POOLING`, and runs `prisma migrate deploy` unchanged. The running app does not read `DIRECT_URL`. |
| `SEED_DEMO` | No | Set to `true` to insert the labelled Northwind demo during that deploy. Any other value, or omitting it, leaves demo data unchanged. The seed skips the insert when `demo@bastion.example` already exists. |
| `BASTION_SCAN_RATE_LIMIT` | No | Default `8` scans per user per window. |
| `BASTION_SCAN_WINDOW_MS` | No | Default `3600000`. |
| `BASTION_SCAN_BUDGET_MS` | No | Default `45000`. Hard stop for one passive scan, under the 60 second function limit. |
| `HIBP_API_KEY` | No | Have I Been Pwned breached-account key. When it is unset, email checks use XposedOrNot only. The password check does not use this key. |

4. Deploy. `vercel.json` runs `node scripts/vercel-build.mjs`, which checks the environment, generates the Prisma client, applies `prisma/migrations` through the unpooled URL, seeds only when `SEED_DEMO=true`, then runs `next build`.
5. You can still seed from a checkout. `npm run db:migrate` fills `DIRECT_URL` the same way before `prisma migrate deploy`. `npm run db:seed` inserts the demo when the email is absent.

```bash
npm run db:migrate
npm run db:seed
```

Every seeded row has `isDemo` set. The password `Bastion-Demo-2026` and the ingest key `bsk_demo_northwind_public_sample` are public sample values. Leave `SEED_DEMO` unset when that login should not exist.

The current public demo is [https://bastion-cyber-defense.vercel.app](https://bastion-cyber-defense.vercel.app). That URL is this deployment, not a service-level agreement and not a certification. A new deployment still needs a Vercel account, a Postgres database, and the variables above.

Local SQLite is `prisma/schema.sqlite.prisma`, updated from `prisma/schema.prisma` by `node scripts/write-sqlite-schema.mjs`, and applied with `prisma db push` (not migrate). Postgres migrations are the production history.

## Docker

A long-lived container can keep SQLite on a volume. The image generates the SQLite client at start. Set `AUTH_SECRET` to at least 32 random characters or sign-in will refuse the placeholder.

```bash
docker build -t bastion .
docker run --rm -p 4317:4317 -e AUTH_SECRET="$(openssl rand -hex 32)" -v bastion-data:/data bastion
```

## Tests and CI

```bash
npm test
npm run build
```

GitHub Actions runs the unit tests, the production build, and the Playwright password check on push (`.github/workflows/ci.yml`).

## Limits

The posture index is not a certification or a penetration test. An exposure check that returns no breach is not proof an account or domain is safe. The password never reaches Bastion; only a five-character hash prefix is sent to Pwned Passwords. Email addresses are not stored. User-agent classification can be spoofed. `robots.txt` does not stop a crawler. The hash chain does not stop an administrator who can rewrite every row. OSV results are only as current as that public database. The content-security policy on this app allows inline scripts because the Next.js build needs them; the fixes Bastion recommends for your site do not. Rate-limit rows survive a new serverless instance; they do not survive a database restore that drops them. The scanner asks Vercel for 60 seconds (`maxDuration`). A Hobby plan can stop the function sooner, and the 45 second budget then records a failed scan instead of leaving the request hanging. DNS pinning and the private-address denylist run in the Node.js runtime, which is what the scan route sets.
