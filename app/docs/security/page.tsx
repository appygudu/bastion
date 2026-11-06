import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Security whitepaper",
  description: "Architecture, threat model, data handling, and retention for Bastion. No certification is claimed.",
};

export default function WhitepaperPage() {
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <article id="content" className="mx-auto max-w-3xl space-y-8 px-4 py-12 text-sm leading-6 text-muted sm:px-5">
        <header>
          <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Whitepaper</p>
          <h1 className="mt-3 font-serif text-5xl text-paper">How Bastion handles data</h1>
          <p className="mt-4 text-paper">This describes the code in this repository. It is not a SOC 2 report, an ISO certificate, or a penetration-test letter. None of those exist.</p>
        </header>
        <section>
          <h2 className="font-serif text-3xl text-paper">Architecture</h2>
          <p className="mt-3">Next.js on Vercel. Production data is Postgres. A local checkout uses SQLite. The scanner, ledger, exposure lookups, and feed fetches run in Node route handlers. Sessions are random tokens stored as a peppered SHA-256 hash. The cookie is HttpOnly and SameSite=Lax, and Secure when the deployment is HTTPS.</p>
          <p className="mt-3">A workspace is the account that owns the scans, properties, and keys. Other accounts join it through an invitation and receive the admin or viewer role. The signed-in person is recorded on audit events.</p>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-paper">Threat model</h2>
          <p className="mt-3">Bastion is written to refuse scans of loopback, private, link-local, and cloud-metadata addresses, including after DNS resolution, and to pin the scan connection to the address it checked. State-changing browser routes require a same-origin request. Auth, scans, exposure lookups, and ingest are rate-limited in the database.</p>
          <p className="mt-3">It does not try to stop a person who already has a database credential, a stolen session cookie, or a stolen API key. Revoke the key in Developers. It does not intercept an agent process: a deny decision is a response the caller has to honor. Webhook delivery checks that the hostname is public HTTPS and does not follow redirects. It does not pin the TCP connection the way the scanner does, so a DNS change between the check and the connection is a residual risk.</p>
          <p className="mt-3">OIDC accepts an ID token only from the provider token endpoint, then checks the RS256 signature against the published JWKS, plus issuer, audience, expiry, nonce, and email_verified. SAML is not implemented. SCIM is not implemented.</p>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-paper">Data handling</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Passwords for accounts are bcrypt hashes. The exposure password check never sends the password or the full hash. It sends a 5-character SHA-1 prefix.</li>
            <li>Agent prompts are hashed with SHA-256 and discarded. Indicator findings store a short match description, not the prompt.</li>
            <li>Ingest keys and API keys are stored as peppered hashes. Webhook signing secrets are encrypted with AES-256-GCM under AUTH_SECRET so a delivery can be signed later.</li>
            <li>PayPal transaction ids and payer emails are stored so an operator can match a claim. Bastion does not call PayPal.</li>
            <li>Security review requests store the name, email, company, and message the person typed.</li>
            <li>Exposure lookups are not written to the database. Scan and ledger rows are.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-paper">Retention</h2>
          <p className="mt-3">There is no automated deletion job. Scans, ledger rows, notifications, claims, and review requests stay until someone with database access deletes them. A revoked API key stays in the table with a revoked timestamp so it cannot be reused. This is a gap if a contract requires a retention schedule.</p>
        </section>
        <section>
          <h2 className="font-serif text-3xl text-paper">What to read next</h2>
          <p className="mt-3"><Link className="text-brass underline" href="/security">Security page</Link>, <Link className="text-brass underline" href="/status">status</Link>, <Link className="text-brass underline" href="/changelog">changelog</Link>, and <Link className="text-brass underline" href="/pitch">readiness</Link>.</p>
        </section>
      </article>
    </div>
  );
}
