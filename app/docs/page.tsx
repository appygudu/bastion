import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Docs" };

export default function DocsPage() {
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <article id="content" className="mx-auto max-w-3xl space-y-8 px-5 pb-20 text-sm leading-6 text-muted">
        <div>
          <h1 className="font-serif text-5xl text-paper">Product notes</h1>
          <p className="mt-4">An honest readiness summary is on <Link className="text-brass underline" href="/pitch">/pitch</Link>. The API is on <Link className="text-brass underline" href="/docs/api">/docs/api</Link>. Architecture, data handling, and retention are in the <Link className="text-brass underline" href="/docs/security">whitepaper</Link>.</p>
          <p className="mt-4">How to run a passive review, ingest a ledger, and read the brief without pretending the index is a certification. Research citations live in <code className="text-paper">docs/RESEARCH.md</code>.</p>
        </div>
        <section>
          <h2 className="font-serif text-3xl text-paper">Scanner</h2>
          <p className="mt-3">Enter a URL, check the ownership box, and submit. The server rejects the request if the box is absent, if the address is private, loopback, link-local, or metadata, if DNS returns any such address, or if the port is not 80, 443, 8080, or 8443. Redirects are checked again. The connection is pinned to the resolved public address. Eight scans per hour by default.</p>
          <p className="mt-3">Checks: CSP, HSTS, framing, nosniff, referrer policy, permissions policy, server and X-Powered-By disclosure, cookie flags, CORS reflection against a probe origin of <code className="text-paper">https://bastion-probe.invalid</code>, mixed content in the HTML sample, <code className="text-paper">robots.txt</code> and <code className="text-paper">ai.txt</code>, TLS protocol and certificate, and HEAD requests for well-known sensitive paths. Findings include nginx, Apache, and Express snippets. HSTS fixes omit <code className="text-paper">preload</code> on purpose, matching the OWASP Secure Headers guidance.</p>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-paper">Dependencies</h2>
          <p className="mt-3">Paste a <code className="text-paper">package.json</code> or <code className="text-paper">requirements.txt</code>. Exact versions are sent to <code className="text-paper">https://api.osv.dev/v1/querybatch</code>. A leading <code className="text-paper">^</code> or <code className="text-paper">~</code> is queried at the base version and labelled. Unpinned packages are not sent. The page links to the OSV record. Bastion does not compute a CVSS number the database did not return.</p>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-paper">Ledger ingest</h2>
          <p className="mt-3">Create a property under Settings. The ingest key is shown once. Send events to <code className="text-paper">POST /api/v1/traffic</code> with <code className="text-paper">Authorization: Bearer &lt;key&gt;</code>.</p>
          <pre className="mt-3 overflow-x-auto bg-ink-2 p-3 font-mono text-xs text-paper">{`{
  "method": "GET",
  "path": "/pricing",
  "status": 200,
  "ip": "203.0.113.10",
  "userAgent": "Mozilla/5.0 (compatible; GPTBot/1.2)",
  "source": "server"
}`}</pre>
          <p className="mt-3">The Express helper is <code className="text-paper">sdk/node/bastion.js</code> (<code className="text-paper">bastionLedger</code>). The browser snippet is <code className="text-paper">sdk/browser/bastion.js</code>. Browser events are forgeable and are flagged <code className="text-paper">untrusted-source</code>. Prefer the middleware.</p>
          <p className="mt-3">Classification uses published user-agent tokens (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bytespider, CCBot, and the others in <code className="text-paper">lib/bots/catalog.ts</code>). A token is not proof of who connected. Conflicting vendors, a crawler token beside curl or python-requests, a missing user-agent, and a burst of 15 or more requests from one IP in 60 seconds are anomaly hints.</p>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-paper">Policy files</h2>
          <p className="mt-3">The policy page exports <code className="text-paper">robots.txt</code> (including a Content-signal line in the vocabulary Cloudflare documents), an <code className="text-paper">ai.txt</code> shaped like the informational draft draft-car-ai-txt-wellknown-00, and an Express deny middleware. The first two do not enforce anything. The third does, on a process you deploy.</p>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-paper">Agent guardrails</h2>
          <p className="mt-3"><code className="text-paper">POST /api/v1/agent-events</code> with the same bearer key. Body: <code className="text-paper">agentName</code>, <code className="text-paper">tool</code>, <code className="text-paper">outcome</code>, <code className="text-paper">content</code>. Content is hashed with SHA-256 and dropped. Rules look for instruction-override phrasing (LLM01), system-prompt disclosure phrasing (LLM07), email, national-id, payment-card, and cloud-key shapes (LLM02), a completed high-impact tool name (LLM06), and a very large context (LLM10). A match is an indicator. The Node helper is <code className="text-paper">logAgentCall</code> in the same SDK file.</p>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-paper">Hash chain and exports</h2>
          <p className="mt-3">Each property has two chains, traffic and agent. The hash is SHA-256 of the previous hash, a newline, and a canonical JSON payload of the row. The genesis value is <code className="text-paper">bastion-genesis-v1</code>. JSON and CSV exports are on the ledger page. Verification rebuilds the payload from the columns, so editing a column without rebuilding the hash fails the check. Rebuilding every hash is possible for whoever can write the database. Export if that matters.</p>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-paper">Exposure check</h2>
          <p className="mt-3">The public page at <code className="text-paper">/exposure</code> is also linked from the workspace sidebar. It does not require a session.</p>
          <p className="mt-3"><code className="text-paper">POST /api/exposure/email</code> asks <code className="text-paper">https://api.xposedornot.com/v1/breach-analytics</code>. The email is not written to the database or to application logs. Rate-limit rows store a hash of the address and a hash of the client address. Five checks per hour per network, and four per address per day. If <code className="text-paper">HIBP_API_KEY</code> is set, the same request also calls the Have I Been Pwned breached-account API. The response keeps breach names, dates, data classes, and a password-storage label. It drops the address, paste bodies, and narrative text.</p>
          <p className="mt-3">The password form hashes the password with SHA-1 in the browser and requests <code className="text-paper">https://api.pwnedpasswords.com/range/</code> plus the first five hex characters, with the <code className="text-paper">Add-Padding</code> header. The password and the full hash are never sent. If that call fails or the body is not a hash list, the browser posts only the five-character prefix to <code className="text-paper">POST /api/exposure/password-range</code>.</p>
          <p className="mt-3"><code className="text-paper">POST /api/exposure/domain</code> reads <code className="text-paper">https://api.xposedornot.com/v1/breaches?domain=</code>. That catalog does not return employee addresses. The verified-domain endpoint that does return addresses is not called. Optional passive hints call the existing scanner and require <code className="text-paper">attested: true</code>. Private, loopback, and metadata targets are refused. Three hinted checks per hour per network.</p>
          <p className="mt-3"><code className="text-paper">GET /api/exposure/advisories</code> caches the CISA Known Exploited Vulnerabilities JSON and OSV.dev queries for a fixed list of AI and agent packages. Each item keeps the source link and date from that feed. If a fetch fails, the previous cache is served when one exists. <code className="text-paper">POST /api/exposure/package</code> asks OSV about one npm or PyPI name.</p>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-paper">Global attacks</h2>
          <p className="mt-3">The public page at <code className="text-paper">/threats</code> is linked from the site header, the landing page, and the workspace sidebar. It does not require a session. A single record is also at <code className="text-paper">/threats/[id]</code>.</p>
          <p className="mt-3"><code className="text-paper">GET /api/threats</code> fetches, on the server, the CISA Known Exploited Vulnerabilities JSON, the NCSC UK report RSS feed, the Cisco Security Advisories RSS feed, the Microsoft Security Update Guide RSS feed, the GitHub Security Advisories API, the ENISA European Vulnerability Database <code className="text-paper">lastvulnerabilities</code> API, a seven-day window of the NVD CVE API, and the CERT-In advisories URL. A successful fetch is kept for 45 minutes in memory and in the database, so a cold start can show the last good copy. If every source fails and a previous copy exists, that copy is returned and marked stale. Thirty requests per hour per network.</p>
          <p className="mt-3">The password form hashes with SHA-1 in the browser. <code className="text-paper">POST /api/exposure/password-range</code> accepts only a 5-character prefix and is used when the browser cannot reach the range API. A weekly re-scan can be saved for a host the workspace has already assessed. The cron route <code className="text-paper">GET /api/cron/rescan</code> runs it when <code className="text-paper">CRON_SECRET</code> is set. The demo workspace cannot scan, create a property, or append events.</p>
          <p className="mt-3">Every card keeps the source link and date. Records that share one CVE identifier are merged. A feed that names several CVEs stays one record. Nothing is added when a response is not the expected JSON or RSS. CERT-In is requested; when that URL does not return a feed, the source list says so and no CERT-In record is shown. CISA <code className="text-paper">requiredAction</code> text, and NVD <code className="text-paper">cisaRequiredAction</code> when present, is shown as the authority&apos;s wording. The &quot;advisory for users&quot; and precautions sections are generated from the record&apos;s fields and always say they are general guidance, not the authority&apos;s words. Sector labels are inferred from keywords. Regions are not inferred. The page can filter by time, severity, sector, an AI keyword, and exploited-in-the-wild, and it can export the filtered set as JSON or CSV.</p>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-paper">Score</h2>
          <p className="mt-3">Web findings start at 100. Critical subtracts 15, high 8, medium 4, low 1, info 0. The executive brief then subtracts up to 16 for agent findings, 10 for ledger anomalies, and 12 for packages with an OSV record. Bands: Controlled 90, Watch 75, Elevated 50, Exposed 25, Critical below that. It is a heuristic.</p>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-paper">Local run</h2>
          <pre className="mt-3 overflow-x-auto bg-ink-2 p-3 font-mono text-xs text-paper">{`cp .env.example .env
npm install
npm test
npm run dev`}</pre>
          <p className="mt-3">The app listens on port 4317. Demo sign-in is <code className="text-paper">demo@bastion.example</code> / <code className="text-paper">Bastion-Demo-2026</code>. Local data is SQLite. Vercel uses hosted Postgres; the README has the environment variables and the <code className="text-paper">prisma migrate deploy</code> step. The scanner runs on the Node.js runtime, pins DNS before it connects, and stops itself at a 45 second budget.</p>
        </section>
        <p><Link className="text-brass" href="/acceptable-use">Acceptable use</Link> · <Link className="text-brass" href="/security">Security</Link></p>
      </article>
    </div>
  );
}
