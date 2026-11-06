import Link from "next/link";
import { DemoTour } from "@/components/demo-tour";
import { Onboarding } from "@/components/onboarding";
import { ScoreRing, ScoreTrend, SeverityBreakdown } from "@/components/risk-charts";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { scoreBand } from "@/lib/scanner/score";
import type { Finding, Severity } from "@/lib/types";

export const metadata = { title: "Overview" };

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

function readFindings(raw: string): { findings: Finding[]; unreadable: boolean } {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return { findings: [], unreadable: true };
    return { findings: value as Finding[], unreadable: false };
  } catch {
    return { findings: [], unreadable: true };
  }
}

export default async function OverviewPage() {
  const user = await requireUser();
  const scanWhere = user.isDemo ? { userId: user.id, isDemo: true } : { userId: user.id };
  const [recent, completed, events, agents, sites, reports] = await Promise.all([
    prisma.scan.findMany({ where: scanWhere, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.scan.findMany({
      where: { ...scanWhere, status: "completed" },
      orderBy: { createdAt: "asc" },
      take: 24,
      select: { id: true, score: true, createdAt: true, url: true, findingsJson: true, isDemo: true },
    }),
    prisma.trafficEvent.count({ where: { site: { userId: user.id } } }),
    prisma.agentEvent.count({ where: { site: { userId: user.id } } }),
    prisma.site.count({ where: { userId: user.id } }),
    prisma.report.count({ where: { userId: user.id } }),
  ]);
  const latest = completed.at(-1) ?? null;
  const parsed = latest ? readFindings(latest.findingsJson) : { findings: [], unreadable: false };
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of parsed.findings) {
    if (finding.severity in counts) counts[finding.severity] += 1;
  }
  const fixFirst = parsed.findings
    .filter((finding) => finding.severity === "critical" || finding.severity === "high")
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const trend = completed.map((scan) => ({
    id: scan.id,
    score: scan.score,
    label: scan.createdAt.toISOString().slice(0, 10),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Overview</p>
          <h1 className="mt-2 font-serif text-4xl">{user.orgName}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            The score, the severity mix, and the findings worth fixing before the rest. Open a row to land on the remediation.
          </p>
        </div>
        <Link href="/app/scan" className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-on-accent">
          {user.isDemo ? "View the fixture" : "New scan"}
        </Link>
      </div>

      {user.isDemo ? (
        <>
          <p className="rounded-md border border-brass/40 bg-brass/10 px-4 py-3 text-sm text-muted">
            This is the labelled Northwind demo. It cannot scan a host, add a property, or append events. The score below is the seeded fixture. Create your own workspace to assess a site you operate.
          </p>
          <DemoTour />
        </>
      ) : (
      <Onboarding
        steps={[
          { id: "property", label: "Add a property", detail: "A hostname is the ingest target for the ledger and the agent log.", href: "/app/settings", done: sites > 0 },
          { id: "scan", label: "Complete a passive scan", detail: "Attest a host you own. The scanner stays read-only.", href: "/app/scan", done: Boolean(latest) },
          { id: "ledger", label: "Record ledger traffic", detail: "Point the middleware or browser snippet at the property key.", href: "/app/ledger", done: events > 0 },
          { id: "agents", label: "Log an agent tool call", detail: "The prompt is hashed. The text is not stored.", href: "/app/agents", done: agents > 0 },
          { id: "report", label: "Generate an executive brief", detail: "The brief explains the index and prints its limits.", href: "/app/reports", done: reports > 0 },
        ]}
      />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Latest scan" value={latest ? String(latest.score) : "—"} detail={latest ? scoreBand(latest.score) : "No completed scan"} />
        <Stat label="Properties" value={String(sites)} detail="Ingest targets" />
        <Stat label="Ledger rows" value={String(events)} detail="Hash-chained requests" />
        <Stat label="Agent calls" value={String(agents)} detail="Tool-call log" />
      </div>

      {!latest ? (
        <section className="rounded-md border border-dashed border-line p-6">
          <h2 className="font-serif text-2xl">No completed scan yet</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            The charts stay empty until a passive scan finishes. Attest a host you operate, or open the seeded Northwind result if this is the demo workspace.
          </p>
          <Link href="/app/scan" className="mt-4 inline-block text-sm text-brass underline">Go to the scanner</Link>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-md border border-line bg-ink-2 p-4 lg:col-span-1">
            <ScoreRing score={latest.score} band={scoreBand(latest.score)} />
            <p className="mt-4 break-all text-xs text-muted">{latest.url}{latest.isDemo ? " · demo fixture" : ""}</p>
          </article>
          <article className="rounded-md border border-line bg-ink-2 p-4">
            <h2 className="text-sm text-paper">Severity breakdown</h2>
            <p className="mt-1 text-xs text-muted">Findings on the latest completed scan.</p>
            <div className="mt-4">
              {parsed.unreadable ? (
                <p className="text-sm text-clay" role="alert">The latest scan record could not be read. Open the scan for the stored error.</p>
              ) : (
                <SeverityBreakdown counts={counts} />
              )}
            </div>
          </article>
          <article className="rounded-md border border-line bg-ink-2 p-4">
            <h2 className="text-sm text-paper">Score trend</h2>
            <p className="mt-1 text-xs text-muted">Completed scans, oldest to newest.</p>
            <div className="mt-3">
              <ScoreTrend points={trend} />
            </div>
          </article>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">Fix first</h2>
          {latest ? <Link href={`/app/scan/${latest.id}`} className="text-sm text-brass">Open full scan</Link> : null}
        </div>
        {!latest ? (
          <p className="rounded-md border border-dashed border-line p-6 text-sm text-muted">Critical and high findings appear here after a scan completes.</p>
        ) : parsed.unreadable ? (
          <p className="rounded-md border border-line p-6 text-sm text-clay" role="alert">Findings for this scan could not be parsed.</p>
        ) : fixFirst.length === 0 ? (
          <p className="rounded-md border border-dashed border-line p-6 text-sm text-muted">No critical or high findings on the latest completed scan.</p>
        ) : (
          <ol className="divide-y divide-line overflow-hidden rounded-md border border-line">
            {fixFirst.map((finding, index) => (
              <li key={finding.id}>
                <Link href={`/app/scan/${latest.id}#${finding.id}`} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-panel">
                  <span>
                    <span className="text-xs text-muted">{index + 1}</span>
                    <span className={`ml-2 text-[11px] uppercase tracking-wider sev-${finding.severity}`}>{finding.severity}</span>
                    <span className="mt-1 block text-sm text-paper">{finding.title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-brass">Remediation</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Recent scans</h2>
          <Link href="/app/scan" className="text-sm text-brass">Scanner</Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-md border border-dashed border-line p-6 text-sm text-muted">No scans yet. Attest a host you own and run the passive checks.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line">
            {recent.map((scan) => (
              <li key={scan.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <Link href={`/app/scan/${scan.id}`} className="break-all text-paper hover:text-brass">{scan.url}</Link>
                  <p className="text-xs text-muted">{scan.status}{scan.isDemo ? " · demo fixture" : ""} · {scan.createdAt.toISOString()}</p>
                </div>
                <span className="font-serif text-2xl">{scan.status === "completed" ? scan.score : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md border border-line bg-ink-2 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-4xl">{value}</p>
      <p className="text-xs text-muted">{detail}</p>
    </div>
  );
}
