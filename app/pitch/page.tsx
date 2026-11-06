import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { enterpriseContact } from "@/lib/public-env";

export const metadata = {
  title: "Readiness",
  description: "An honest summary of what Bastion does today, how it is built, and what is not yet true.",
};

const works = [
  "Passive scan of a host you attest: headers, TLS, cookies, CORS, mixed content, robots.txt, ai.txt, and well-known sensitive paths, with nginx, Apache, and Express snippets.",
  "Dependency review of a package.json or requirements.txt against the public OSV.dev API. Unpinned versions are labelled, not guessed.",
  "Hash-chained ledger of crawler and browser events, plus an agent tool-call log that stores a prompt hash and indicator rules, not the prompt.",
  "Allow and deny policy with copyable robots.txt, an ai.txt draft, and Express middleware. Only the middleware enforces a decision.",
  "Executive brief as HTML and PDF. The index is a heuristic and the brief says so.",
  "Public exposure check: XposedOrNot for email and domain names, optional Have I Been Pwned, and a k-anonymity password range. The password and the full hash are not sent.",
  "Public global-attacks page fed by CISA KEV, NCSC UK, Cisco, Microsoft, GitHub Security Advisories, ENISA, and a short NVD window. Each card keeps its source link and date.",
  "Owner, admin, and viewer roles, invitation links, and an audit log of those admin actions.",
  "API keys with scans:read and scans:write, a public OpenAPI document, and HTTPS webhooks after a completed scan.",
  "Guardrail decisions of allow, flag, or deny by tool, hostname, and prompt-injection indicators. The caller enforces deny.",
  "A PayPal claim an operator approves by hand. That is the only way a workspace becomes Team.",
];

const absent = [
  "No SOC 2, ISO 27001, or other certification, and no penetration-test letter.",
  "No customers, logos, testimonials, revenue, or uptime percentage.",
  "No SAML and no SCIM. OIDC runs only when the operator sets Google or generic OIDC variables. The login page says when they are unset.",
  "No PayPal webhook. Paying does not change the plan until an operator approves the claim.",
  "Email sends only for a Team workspace, and only when RESEND_API_KEY and RESEND_FROM are set. The status page says whether they are.",
  "Weekly re-scans run only for Team workspaces, and only when CRON_SECRET is set.",
  "No automated data-retention job.",
  "Webhook delivery checks DNS and does not follow redirects. It does not pin the connection the way the scanner does.",
  "CERT-In is requested and shown as unavailable when that URL does not return a feed.",
  "The public demo password is published. That workspace is read-only and cannot scan a third party.",
];

export default function PitchPage() {
  const contact = enterpriseContact();
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <article id="content" className="mx-auto max-w-3xl space-y-10 px-4 py-12 text-sm leading-6 text-muted sm:px-5">
        <header>
          <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Readiness</p>
          <h1 className="mt-3 font-serif text-4xl text-paper sm:text-5xl">What Bastion is today</h1>
          <p className="mt-4 text-paper">A working defensive workspace for sites and agents a team operates. It is safe to open and try. It is not an audited enterprise service, and this page does not claim that it is.</p>
        </header>

        <section>
          <h2 className="font-serif text-2xl text-paper">The problem</h2>
          <p className="mt-3">Security teams are asked what AI crawlers touched a site, whether a host they own has basic header and TLS gaps, and whether a password or an address shows up in a public breach catalog. Those answers are usually split across vendor blogs, a scanner they are not allowed to point at production, and a spreadsheet. Bastion puts the passive read, the crawler ledger, and the brief in one workspace, and it refuses the scan that should not run.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-paper">What works today</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {works.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="mt-3">Try it: the <Link className="text-brass underline" href="/demo">walkthrough</Link>, the <Link className="text-brass underline" href="/exposure">exposure check</Link>, <Link className="text-brass underline" href="/threats">global attacks</Link>, and the <Link className="text-brass underline" href="/login">labelled demo</Link> (<span className="font-mono text-paper">demo@bastion.example</span>). The Northwind score is a fixture. It is not a customer and not a live scan. A security review request lives on <Link className="text-brass underline" href="/enterprise">/enterprise</Link>.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-paper">Architecture</h2>
          <p className="mt-3">Next.js on Vercel, with Postgres for the deployment and SQLite for a local checkout. Sessions are random tokens stored only as a peppered SHA-256 hash in an HttpOnly, SameSite=Lax cookie. Passwords are bcrypt hashes. The scanner checks DNS, refuses private and metadata addresses, pins the connection, and stops on a time budget. Feed responses are cached in the database so a cold start can show the last successful fetch. The ledger is a per-property SHA-256 hash chain.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-paper">Security posture</h2>
          <p className="mt-3">State-changing routes check the request origin. Auth, scans, exposure lookups, and ingest are rate-limited in the database. The demo account cannot scan, create a property, save a policy, or append events. Outbound fetches for feeds and breach catalogs stay on an HTTPS host allowlist. This is the application&apos;s own control list. It is not a certification. Details are on the <Link className="text-brass underline" href="/security">security page</Link> and in <span className="font-mono text-paper">SECURITY.md</span>.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-paper">Roadmap, without dates</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>SAML and SCIM, if an operator needs them. OIDC is the path that exists today, and only when configured.</li>
            <li>A PayPal webhook. Until then, plan changes are a manual approval.</li>
            <li>Setting CRON_SECRET, RESEND_API_KEY, RESEND_FROM, and ADMIN_EMAILS on the deployment that should use them.</li>
            <li>A retention schedule and a formal audit, if a contract requires them. Neither is in the product.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-paper">What is not here</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {absent.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-paper">Enterprise contact</h2>
          {contact?.kind === "email" ? (
            <p className="mt-3">Write to <a className="text-brass underline" href={`mailto:${contact.value}`}>{contact.value}</a>. A conversation is not a contract, a certification, or a promise of a feature on this list.</p>
          ) : contact?.kind === "url" ? (
            <p className="mt-3">The operator published <a className="text-brass underline" href={contact.value}>this contact page</a>. A conversation is not a contract or a certification.</p>
          ) : (
            <p className="mt-3">This deployment has not published an enterprise address. Use the <Link className="text-brass underline" href="/security">security page</Link> for a defect. Do not send production data until the operator of the database says where it lives and who can read it.</p>
          )}
        </section>
      </article>
    </div>
  );
}
