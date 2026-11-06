import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ThreatDetail } from "@/components/threat-detail";
import { THREAT_NOTE } from "@/lib/threats/copy";
import { loadThreats } from "@/lib/threats/feed";
import { decodeThreatId } from "@/lib/threats/model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const feed = await loadThreats();
  const incident = feed.items.find((item) => item.id === decodeThreatId(id));
  return {
    title: incident?.title ?? "Threat record",
    description: incident?.summary.slice(0, 180) ?? "A record from the public threat feeds.",
  };
}

export default async function ThreatRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const feed = await loadThreats();
  const incident = feed.items.find((item) => item.id === decodeThreatId(id));
  if (!incident) {
    if (feed.error) {
      return (
        <div className="grid-fade min-h-screen">
          <SiteHeader />
          <main id="content" className="mx-auto max-w-3xl px-4 py-12 sm:px-5">
            <p className="text-sm text-clay" role="alert">{feed.error}</p>
            <Link href="/threats" className="mt-4 inline-block text-sm text-brass underline">Back to global attacks</Link>
          </main>
        </div>
      );
    }
    notFound();
  }
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <main id="content" className="mx-auto max-w-3xl px-4 py-12 sm:px-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Global attacks</p>
        <p className="mt-3 text-sm"><Link href="/threats" className="text-brass underline">All records</Link></p>
        {feed.updatedAt ? <p className="mt-3 text-xs text-muted">Last updated <time dateTime={feed.updatedAt}>{feed.updatedAt}</time>{feed.stale ? " · previous successful fetch" : ""}</p> : null}
        <div className="mt-6">
          <ThreatDetail incident={incident} />
        </div>
        <p className="mt-8 text-sm leading-6 text-muted">{THREAT_NOTE}</p>
      </main>
    </div>
  );
}
