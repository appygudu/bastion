import { DepForm } from "@/components/dep-form";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { OsvVuln } from "@/lib/deps/osv";

export const metadata = { title: "Dependencies" };

interface StoredPackage {
  name: string;
  ecosystem: string;
  version: string | null;
  exact: boolean;
  note: string;
  vulns: OsvVuln[];
}

export default async function DependenciesPage() {
  const user = await requireUser();
  const reviews = await prisma.dependencyReview.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 });
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Dependencies</p>
        <h1 className="mt-2 font-serif text-4xl">Manifest review</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Bastion sends pinned names and versions to the public OSV.dev API. It does not invent CVE identifiers. A range is queried at its base version and labelled as such.</p>
      </div>
      <DepForm readOnly={user.isDemo} />
      {reviews.length === 0 ? <p className="text-sm text-muted">No reviews yet. The demo workspace does not invent a vulnerability list.</p> : reviews.map((review) => {
        const packages = JSON.parse(review.resultJson) as StoredPackage[];
        return (
          <section key={review.id} className="space-y-3">
            <h2 className="font-serif text-2xl">{review.kind} · {review.createdAt.toISOString()}</h2>
            <p className="text-xs text-muted">{review.packageCount} packages · {review.vulnCount} with at least one OSV record{review.isDemo ? " · demo" : " · live query"}</p>
            <ul className="divide-y divide-line border border-line">
              {packages.map((pkg) => (
                <li key={`${pkg.ecosystem}-${pkg.name}`} className="px-4 py-3 text-sm">
                  <p className="font-mono text-xs">{pkg.ecosystem}:{pkg.name}@{pkg.version ?? "unpinned"}</p>
                  <p className="text-xs text-muted">{pkg.note}</p>
                  {pkg.vulns.length === 0 ? <p className="mt-1 text-sage">No OSV records returned for this query.</p> : (
                    <ul className="mt-2 space-y-2">
                      {pkg.vulns.slice(0, 8).map((vuln) => (
                        <li key={vuln.id}>
                          <a className="text-brass underline" href={`https://osv.dev/vulnerability/${encodeURIComponent(vuln.id)}`}>{vuln.id}</a>
                          {vuln.aliases.length ? <span className="text-muted"> · {vuln.aliases.slice(0, 3).join(", ")}</span> : null}
                          <p className="text-muted">{vuln.summary || "OSV did not include a summary."}</p>
                          {vuln.severity.length ? <p className="font-mono text-[11px] text-muted">{vuln.severity.map((item) => `${item.type}: ${item.score}`).join(" · ")}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
