import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { ReportModel } from "@/lib/reports/model";

export const metadata = { title: "Brief" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const report = await prisma.report.findFirst({ where: { id, userId: user.id } });
  if (!report) notFound();
  const model = JSON.parse(report.payloadJson) as ReportModel;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/app/reports" className="text-xs text-muted">All briefs</Link>
          <h1 className="mt-2 font-serif text-4xl">{model.title}</h1>
          <p className="text-sm text-muted">{model.generatedAt} · {model.band}</p>
        </div>
        <div className="flex gap-3 text-sm">
          <a className="text-brass underline" href={`/api/app/reports/${report.id}/html`}>Open HTML</a>
          <a className="text-brass underline" href={`/api/app/reports/${report.id}/pdf`}>Download PDF</a>
        </div>
      </div>
      {model.demo ? <p className="border border-brass/40 bg-brass/10 p-3 text-sm text-brass">This brief includes the labelled demo fixture.</p> : null}
      <p className="font-serif text-6xl">{model.score}</p>
      <p className="max-w-3xl text-sm">{model.narrative}</p>
      <section>
        <h2 className="font-serif text-2xl">Roadmap</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {model.roadmap.map((phase) => (
            <div key={phase.horizon} className="border border-line p-4">
              <h3 className="text-sm text-brass">{phase.horizon}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">{phase.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-serif text-2xl">Limitations printed on the brief</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">{model.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
    </div>
  );
}
