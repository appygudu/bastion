import { SiteHeader } from "@/components/site-header";
import { ThreatsBoard } from "@/components/threats-board";

export const metadata = {
  title: "Global attacks",
  description: "Recent cyber records fetched from CISA, NCSC UK, ENISA, NVD, GitHub, and vendor security feeds.",
};

export default function ThreatsPage() {
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <main id="content" className="mx-auto max-w-6xl px-4 py-12 sm:px-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Global attacks</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">What the public feeds published</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
          Each card is a record read from a public feed: a title, a date, and a link back to that source. Where a feed only describes a vulnerability, the user advisory and precautions are generated from those fields and labelled as general guidance.
        </p>
        <div className="mt-8">
          <ThreatsBoard />
        </div>
      </main>
    </div>
  );
}
