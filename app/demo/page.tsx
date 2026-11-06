import { DemoTour } from "@/components/demo-tour";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Demo walkthrough",
  description: "A short path through the public checks and the labelled demo workspace.",
};

export default function DemoPage() {
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <main id="content" className="mx-auto max-w-3xl px-4 py-12 sm:px-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Demo</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Walk the product without a customer story</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">Six steps. Each one opens a real page. The Northwind workspace is labelled demo and is read-only. Progress stays in this browser.</p>
        <div className="mt-8"><DemoTour /></div>
      </main>
    </div>
  );
}
