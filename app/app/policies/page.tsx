import { PolicyEditor } from "@/components/policy-editor";
import { requireUser } from "@/lib/auth/session";
import { defaultPolicy, type PolicyRule } from "@/lib/bots/policy";
import { prisma } from "@/lib/db";

export const metadata = { title: "Policies" };

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const sites = await prisma.site.findMany({ where: { userId: user.id }, include: { policy: true }, orderBy: { createdAt: "asc" } });
  const site = sites.find((item) => item.id === params.site) ?? sites[0];
  if (!site) return <p className="text-sm text-muted">Create a property in Settings first.</p>;
  const rules = site.policy ? (JSON.parse(site.policy.rulesJson) as PolicyRule[]) : defaultPolicy();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Policies</p>
        <h1 className="mt-2 font-serif text-4xl">Allow and deny</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Defaults deny training crawlers and allow search. That is a starting point, not legal advice. robots.txt will not stop a crawler that ignores it.</p>
      </div>
      <PolicyEditor siteId={site.id} host={site.hostname} initial={rules} readOnly={user.isDemo} />
    </div>
  );
}
