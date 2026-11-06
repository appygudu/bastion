import Link from "next/link";
import { LedgerTable, type LedgerRow } from "@/components/ledger-table";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { trafficPayload, verifyChain } from "@/lib/audit/hashchain";

export const metadata = { title: "Ledger" };

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const sites = await prisma.site.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  const site = sites.find((item) => item.id === params.site) ?? sites[0];
  if (!site) {
    return (
      <div>
        <h1 className="font-serif text-4xl">Ledger</h1>
        <p className="mt-3 text-sm text-muted">Add a property in Settings before logs can land.</p>
      </div>
    );
  }
  const [events, chainRows] = await Promise.all([
    prisma.trafficEvent.findMany({ where: { siteId: site.id }, orderBy: { seq: "desc" }, take: 80 }),
    prisma.trafficEvent.findMany({
      where: { siteId: site.id },
      orderBy: { seq: "asc" },
      select: {
        id: true,
        occurredAt: true,
        siteId: true,
        method: true,
        path: true,
        status: true,
        ip: true,
        userAgent: true,
        agent: true,
        category: true,
        source: true,
        anomalyCodes: true,
        prevHash: true,
        hash: true,
      },
    }),
  ]);
  const chain = verifyChain(chainRows.map((row) => ({
    prevHash: row.prevHash,
    hash: row.hash,
    payload: trafficPayload({
      id: row.id,
      occurredAt: row.occurredAt,
      siteId: row.siteId,
      method: row.method,
      path: row.path,
      status: row.status,
      ip: row.ip,
      userAgent: row.userAgent,
      agent: row.agent,
      category: row.category,
      source: row.source,
      anomalyCodes: row.anomalyCodes,
    }),
  })));
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.agent || event.category, (counts.get(event.agent || event.category) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = top[0]?.[1] ?? 1;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Ledger</p>
          <h1 className="mt-2 font-serif text-4xl">{site.name}</h1>
          <p className="mt-2 text-sm text-muted">{site.hostname} · chain {chain.ok ? "verified" : `broken at row ${chain.brokenAt}`} · {site.isDemo ? "demo rows included" : "live property"}</p>
          <p className="mt-2 max-w-xl text-xs text-muted">Verification walks every stored row for this property, from the genesis hash through the newest event. A broken chain means a stored row no longer matches its hash. Export JSON to keep a copy outside this database.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <a className="text-brass underline" href={`/api/app/export?siteId=${site.id}&format=json`}>Export JSON</a>
          <a className="text-brass underline" href={`/api/app/export?siteId=${site.id}&format=csv`}>Export CSV</a>
        </div>
      </div>
      {sites.length > 1 ? (
        <div className="flex flex-wrap gap-2 text-sm">
          {sites.map((item) => (
            <Link key={item.id} href={`/app/ledger?site=${item.id}`} className={item.id === site.id ? "text-brass" : "text-muted"}>{item.hostname}</Link>
          ))}
        </div>
      ) : null}
      <section>
        <h2 className="font-serif text-2xl">Top actors in this page</h2>
        <ul className="mt-4 space-y-2">
          {top.map(([name, count]) => (
            <li key={name} className="grid grid-cols-[140px_1fr_32px] items-center gap-3 text-sm">
              <span className="truncate font-mono text-xs">{name}</span>
              <span className="h-2 bg-ink-2"><span className="block h-2 bg-brass" style={{ width: `${(count / max) * 100}%` }} /></span>
              <span className="text-muted">{count}</span>
            </li>
          ))}
        </ul>
      </section>
      <LedgerTable rows={events.map((event): LedgerRow => ({
        id: event.id,
        occurredAt: event.occurredAt,
        method: event.method,
        path: event.path,
        status: event.status,
        ip: event.ip,
        agent: event.agent,
        category: event.category,
        source: event.source,
        userAgent: event.userAgent,
        anomalies: readAnomalies(event.anomalyJson),
      }))} />
      <p className="text-xs text-muted">Showing the latest 80 rows. Chain status covers every row for this property, from the genesis hash through the newest event. Export JSON or CSV for the full audit file.</p>
    </div>
  );
}

function readAnomalies(raw: string): LedgerRow["anomalies"] {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value as LedgerRow["anomalies"];
  } catch {
    return [];
  }
}
