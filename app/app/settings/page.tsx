import { SiteForm } from "@/components/site-form";
import { requireUser } from "@/lib/auth/session";
import { DEMO_INGEST_KEY } from "@/lib/demo";
import { prisma } from "@/lib/db";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const sites = await prisma.site.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Settings</p>
        <h1 className="mt-2 font-serif text-4xl">Properties and ingest</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">The server middleware should hold the ingest key. A key embedded in a public page can be copied, and those events are marked untrusted.</p>
      </div>
      {user.isDemo ? (
        <div className="border border-brass/40 bg-brass/10 p-4 text-sm">
          <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Demo ingest key</p>
          <p className="mt-2 font-mono text-xs">{DEMO_INGEST_KEY}</p>
          <p className="mt-2 text-muted">Public sample for the seeded Northwind property. Do not reuse it outside this workspace.</p>
        </div>
      ) : null}
      <ul className="divide-y divide-line border border-line text-sm">
        {sites.map((site) => (
          <li key={site.id} className="px-4 py-3">
            <p>{site.name}</p>
            <p className="text-xs text-muted">{site.hostname} · key prefix {site.ingestPrefix}…{site.isDemo ? " · demo" : ""}</p>
          </li>
        ))}
      </ul>
      <SiteForm readOnly={user.isDemo} />
    </div>
  );
}
