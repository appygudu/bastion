import Link from "next/link";
import { PaymentClaimForm } from "@/components/payment-claim-form";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { paymentLink } from "@/lib/public-env";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const user = await requireUser();
  const link = paymentLink();
  const claims = await prisma.paymentClaim.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 });
  const pending = claims.some((claim) => claim.status === "pending");
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Billing</p>
        <h1 className="mt-2 font-serif text-4xl">Plan</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">This workspace is <span className="text-paper">{user.plan === "team" ? "Team" : "Free"}</span>. Checkout, when a payment link is set, happens on PayPal. Bastion does not receive a PayPal webhook. The operator approves a claim in the admin view, and that is what changes the plan.</p>
      </div>
      <section className="border border-line p-4 text-sm">
        <h2 className="font-serif text-2xl">Team, after approval</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
          <li>Weekly re-scans, when CRON_SECRET is set on the deployment.</li>
          <li>Email on a completed scan, when RESEND_API_KEY and RESEND_FROM are set.</li>
          <li>Higher limits: 10 API keys, 5 webhooks, 20 invitations.</li>
        </ul>
        <p className="mt-3 text-muted">A free workspace can still scan by hand, keep a ledger, export a PDF, and create two API keys. The status page shows whether the scheduler and email are configured.</p>
        <div className="mt-4">
          {link ? <a href={link} className="rounded-sm bg-brass px-4 py-3 text-sm font-medium text-on-accent">Continue to payment</a> : <span className="text-muted">No payment link is configured. The pricing page shows Coming soon.</span>}
        </div>
      </section>
      {user.plan === "team" ? <p className="text-sm text-sage">This workspace is already Team.</p> : user.role !== "owner" || user.isDemo ? (
        <p className="text-sm text-muted">{user.isDemo ? "The demo workspace cannot submit a payment claim." : "Only the workspace owner can submit a claim."}</p>
      ) : (
        <PaymentClaimForm disabled={pending} />
      )}
      <section>
        <h2 className="font-serif text-2xl">Claims</h2>
        {claims.length === 0 ? <p className="mt-3 text-sm text-muted">No claims yet.</p> : (
          <ul className="mt-3 divide-y divide-line border border-line text-sm">
            {claims.map((claim) => (
              <li key={claim.id} className="px-4 py-3">
                <p className="font-mono text-xs">{claim.transactionId}</p>
                <p className="text-muted">{claim.payerEmail} · {claim.status}{claim.reviewNote ? ` · ${claim.reviewNote}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm"><Link className="text-brass underline" href="/pricing">Pricing</Link></p>
      </section>
    </div>
  );
}
