import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Changelog" };

const entries = [
  {
    date: "2026-10-23",
    title: "Workspaces, keys, and manual Team approval",
    items: [
      "Payment claims: a buyer submits a PayPal transaction id. An operator approves it. There is no PayPal webhook.",
      "Roles: owner, admin, and viewer, with invitation links and an audit log.",
      "API keys with scans:read and scans:write, an OpenAPI document, and signed scan webhooks.",
      "OIDC sign-in when Google or a generic issuer is configured. SAML is not implemented.",
      "Guardrail decisions allow, flag, and deny by tool, hostname, and prompt-injection indicators.",
      "In-app notifications. Email only when Resend is configured and the workspace is Team.",
      "Security review requests, a whitepaper, this changelog, and a status check that pings the database.",
    ],
  },
  {
    date: "2026-10-23",
    title: "Public checks and a workspace",
    items: [
      "Passive scanner, dependency review, hash-chained ledger, agent log, PDF brief, exposure check, and global attacks.",
      "Weekly re-scan job, armed only when CRON_SECRET is set.",
      "Trust pages, pricing, and an honest readiness note.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <main id="content" className="mx-auto max-w-3xl px-4 py-12 sm:px-5">
        <h1 className="font-serif text-5xl">Changelog</h1>
        <p className="mt-4 text-sm text-muted">What shipped in this codebase. Dates are the days the work landed, not a release train.</p>
        <div className="mt-10 space-y-10">
          {entries.map((entry) => (
            <article key={entry.title}>
              <p className="text-xs uppercase tracking-[0.16em] text-brass">{entry.date}</p>
              <h2 className="mt-2 font-serif text-3xl">{entry.title}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
                {entry.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
