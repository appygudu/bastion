import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <main id="content" className="mx-auto flex max-w-3xl flex-col items-start px-6 py-24">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brass">404</p>
        <h1 className="mt-3 font-serif text-4xl">That page is not on this site.</h1>
        <p className="mt-4 max-w-lg text-sm text-muted">The address does not match a public page or a workspace screen. Use the links below, or go back to the start.</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/" className="rounded-sm bg-brass px-4 py-2 font-medium text-on-accent">Home</Link>
          <Link href="/exposure" className="rounded-sm border border-line px-4 py-2">Exposure check</Link>
          <Link href="/pitch" className="rounded-sm border border-line px-4 py-2">Readiness</Link>
        </div>
      </main>
    </div>
  );
}
