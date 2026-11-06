import Link from "next/link";
import { RescanSchedule } from "@/components/rescan-schedule";
import { ScanForm } from "@/components/scan-form";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const metadata = { title: "Scanner" };

export default async function ScanPage() {
  const user = await requireUser();
  const scans = await prisma.scan.findMany({
    where: user.isDemo ? { userId: user.id, isDemo: true } : { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const schedules = user.isDemo ? [] : await prisma.scanSchedule.findMany({ where: { userId: user.id, enabled: true }, orderBy: { nextRunAt: "asc" } });
  const assessed = [...new Set(scans.filter((scan) => scan.status === "completed" && !scan.isDemo).map((scan) => scan.url))];
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Scanner</p>
        <h1 className="mt-2 font-serif text-4xl">Passive assessment</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Headers, TLS, cookies, CORS, mixed content, crawler files, and the presence of well-known sensitive paths. Eight scans per hour. Private and metadata addresses are refused.</p>
      </div>
      <ScanForm readOnly={user.isDemo} />
      {user.isDemo ? null : (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Weekly re-scan</h2>
          <p className="max-w-2xl text-sm text-muted">A saved schedule re-checks a host this workspace has already assessed. It runs only when this deployment has a cron secret and the workspace plan is Team. The demo workspace cannot use it.</p>
          {user.plan === "team" ? <RescanSchedule urls={assessed} /> : (
            <p className="text-sm text-muted">This workspace is Free. <Link className="text-brass underline" href="/app/billing">Submit a PayPal claim</Link> and wait for the operator to approve it before saving a weekly re-scan. Manual scans still work.</p>
          )}
          {schedules.length === 0 ? <p className="text-sm text-muted">No weekly re-scan is saved.</p> : (
            <ul className="divide-y divide-line border border-line text-sm">
              {schedules.map((schedule) => (
                <li key={schedule.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                  <span>{schedule.url}</span>
                  <span className="text-xs text-muted">Next {schedule.nextRunAt.toISOString().slice(0, 10)}{schedule.lastStatus ? ` · last ${schedule.lastStatus}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <section>
        <h2 className="font-serif text-2xl">History</h2>
        {scans.length === 0 ? <p className="mt-3 rounded-md border border-dashed border-line p-6 text-sm text-muted">No scans yet. Attest a host you own, then run the passive checks.</p> : (
          <ul className="mt-3 divide-y divide-line border border-line">
            {scans.map((scan) => (
              <li key={scan.id}>
                <Link href={`/app/scan/${scan.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-panel">
                  <span>{scan.url}<span className="ml-2 text-xs text-muted">{scan.isDemo ? "demo fixture" : scan.status}</span></span>
                  <span>{scan.status === "completed" ? scan.score : scan.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
