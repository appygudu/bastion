import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const user = await requireUser();
  const reports = await prisma.report.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Reports</p>
        <h1 className="mt-2 font-serif text-4xl">Executive brief</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Built from the latest completed scan, the ledger, agent findings, and the newest dependency review. The index is explained on the brief, including what it is not.</p>
      </div>
      <form action="/api/app/reports" method="post">
        <button className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-on-accent" type="submit">Generate brief</button>
      </form>
      {reports.length === 0 ? <p className="rounded-md border border-dashed border-line p-6 text-sm text-muted">No briefs yet. Generate one after a scan, a ledger, or a dependency review exists. The brief prints what the index leaves out.</p> : (
        <ul className="divide-y divide-line border border-line">
          {reports.map((report) => (
            <li key={report.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <Link href={`/app/reports/${report.id}`} className="text-paper hover:text-brass">{report.title}</Link>
                <p className="text-xs text-muted">{report.createdAt.toISOString()}{report.isDemo ? " · includes demo fixture" : ""}</p>
              </div>
              <span className="font-serif text-2xl">{report.score}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
