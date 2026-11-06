import Link from "next/link";
import { notFound } from "next/navigation";
import { FindingExplorer } from "@/components/finding-explorer";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { scoreBand } from "@/lib/scanner/score";
import type { Finding, Pass } from "@/lib/types";

export const metadata = { title: "Scan" };

function readList<T>(raw: string): { items: T[]; unreadable: boolean } {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return { items: [], unreadable: true };
    return { items: value as T[], unreadable: false };
  } catch {
    return { items: [], unreadable: true };
  }
}

export default async function ScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const scan = await prisma.scan.findFirst({ where: { id, userId: user.id } });
  if (!scan || (user.isDemo && !scan.isDemo)) notFound();
  const findings = readList<Finding>(scan.findingsJson);
  const passes = readList<Pass>(scan.passesJson);
  const meta = (() => {
    try {
      return JSON.parse(scan.metaJson) as { mode?: string; note?: string; error?: string };
    } catch {
      return {};
    }
  })();
  return (
    <div className="space-y-8">
      <div>
        <Link href="/app/scan" className="text-xs text-muted hover:text-paper">Back to scanner</Link>
        <h1 className="mt-2 break-all font-serif text-4xl">{scan.url}</h1>
        <p className="mt-2 text-sm text-muted">{scan.createdAt.toISOString()} · {scan.status}{scan.isDemo ? " · demo fixture, no network request" : ""}</p>
        {meta.note ? <p className="mt-2 text-sm text-brass">{meta.note}</p> : null}
        {scan.error ? <p className="mt-2 text-sm text-clay" role="alert">{scan.error}</p> : null}
      </div>
      {scan.status === "completed" ? (
        <div className="flex flex-wrap items-end gap-4 rounded-md border border-line bg-ink-2 p-4">
          <p className="font-serif text-6xl leading-none">{scan.score}</p>
          <p className="pb-1 text-sm text-muted">{scoreBand(scan.score)} · weighted heuristic, not a certification</p>
        </div>
      ) : scan.status === "failed" ? (
        <p className="rounded-md border border-line p-4 text-sm text-clay" role="alert">This scan did not complete. The message above is the reason the server recorded.</p>
      ) : (
        <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">This scan is {scan.status}. Findings appear when it completes.</p>
      )}
      {findings.unreadable || passes.unreadable ? (
        <p className="text-sm text-clay" role="alert">Part of this scan record could not be read. Export is unavailable until the stored JSON parses.</p>
      ) : (
        <FindingExplorer findings={findings.items} passes={passes.items} />
      )}
    </div>
  );
}
