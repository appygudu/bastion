import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { paymentLink } from "@/lib/public-env";

export const metadata = {
  title: "Pricing",
  description: "A free workspace, and a Team plan that an operator applies after a PayPal claim.",
};

const free = [
  "Exposure check for an email, a k-anonymity password range, and a domain catalog",
  "Global attacks, with source links and dates",
  "The labelled demo workspace, which is read-only",
  "A workspace with manual scans, a ledger, dependency review, PDF reports, two API keys, one webhook, and two invitations",
  "In-app notifications",
];

const team = [
  "Weekly re-scans of a host this workspace has already assessed, when CRON_SECRET is set",
  "Email when a scan completes, when RESEND_API_KEY and RESEND_FROM are set",
  "Higher limits: 10 API keys, 5 webhooks, and 20 invitations",
];

export default function PricingPage() {
  const link = paymentLink();
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <main id="content" className="mx-auto max-w-6xl px-4 py-12 sm:px-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Pricing</p>
        <h1 className="mt-3 max-w-3xl font-serif text-4xl sm:text-5xl">Free to look. A workspace when you operate a site.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          Creating a workspace does not charge a card. This page does not state a price, because the amount is whatever a configured payment link charges. No payment link is a sale.
        </p>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <section className="rounded-md border border-line bg-ink-2 p-6">
            <h2 className="font-serif text-3xl">Free</h2>
            <p className="mt-2 text-sm text-muted">No account required, except the published demo sign-in.</p>
            <ul className="mt-5 space-y-3 text-sm text-muted">
              {free.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <Link href="/exposure" className="mt-6 inline-block rounded-sm border border-line px-4 py-3 text-sm">Open the exposure check</Link>
          </section>
          <section className="rounded-md border border-brass/50 bg-ink-2 p-6">
            <h2 className="font-serif text-3xl">Team</h2>
            <p className="mt-2 text-sm text-brass">Low cost · paid when a payment link is configured</p>
            <ul className="mt-5 space-y-3 text-sm text-muted">
              {team.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className="mt-5 text-sm text-muted">Checkout, when a payment link is configured, happens on PayPal. Bastion does not receive a PayPal webhook. After you pay, submit the transaction id in the workspace. The plan becomes Team only when an operator approves that claim.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {link ? (
                <a href={link} className="rounded-sm bg-brass px-4 py-3 text-sm font-medium text-on-accent">Continue to payment</a>
              ) : (
                <button type="button" disabled className="rounded-sm bg-brass px-4 py-3 text-sm font-medium text-on-accent opacity-60">Coming soon</button>
              )}
              <Link href="/signup" className="rounded-sm border border-line px-4 py-3 text-sm">Create a workspace</Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
