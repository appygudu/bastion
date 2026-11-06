import { ClaimReviewForm, ReviewStatusForm } from "@/components/admin-actions";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const metadata = { title: "Operator" };

export default async function AdminPage() {
  const user = await requireUser();
  if (!isPlatformAdmin(user)) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-4xl">Operator</h1>
        <p className="max-w-2xl text-sm text-muted">This view is for the addresses in ADMIN_EMAILS. The list is not shown here. The demo account cannot use it.</p>
      </div>
    );
  }
  const [claims, reviews] = await Promise.all([
    prisma.paymentClaim.findMany({ where: { status: "pending" }, orderBy: { createdAt: "asc" }, take: 50 }),
    prisma.securityReviewRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const owners = await prisma.user.findMany({ where: { id: { in: claims.map((claim) => claim.userId) } }, select: { id: true, email: true, orgName: true } });
  const byId = new Map(owners.map((owner) => [owner.id, owner]));
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Operator</p>
        <h1 className="mt-2 font-serif text-4xl">Claims and review requests</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Approving a claim sets that workspace to Team. Rejecting it leaves the plan unchanged. Nothing here talks to PayPal.</p>
      </div>
      <section>
        <h2 className="font-serif text-2xl">Payment claims</h2>
        {claims.length === 0 ? <p className="mt-3 text-sm text-muted">No claims are waiting.</p> : (
          <ul className="mt-3 space-y-3">
            {claims.map((claim) => {
              const owner = byId.get(claim.userId);
              return (
                <li key={claim.id} className="border border-line p-4 text-sm">
                  <p>{owner?.orgName ?? "Workspace"} · {owner?.email ?? claim.userId}</p>
                  <p className="font-mono text-xs">{claim.transactionId}</p>
                  <p className="text-muted">{claim.payerEmail}{claim.note ? ` · ${claim.note}` : ""}</p>
                  <ClaimReviewForm id={claim.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-serif text-2xl">Security review requests</h2>
        {reviews.length === 0 ? <p className="mt-3 text-sm text-muted">No requests yet.</p> : (
          <ul className="mt-3 space-y-3">
            {reviews.map((review) => (
              <li key={review.id} className="border border-line p-4 text-sm">
                <p>{review.company} · {review.name} · {review.email}</p>
                <p className="mt-2 text-muted">{review.message}</p>
                <div className="mt-2"><ReviewStatusForm id={review.id} status={review.status} /></div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
