"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <main id="content" className="mx-auto flex max-w-3xl flex-col items-start px-6 py-24">
      <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Error</p>
      <h1 className="mt-3 font-serif text-4xl">This page could not be shown.</h1>
      <p className="mt-4 max-w-lg text-sm text-muted">The failure was recorded as a digest. Refresh the view, or go back to the start of the site.</p>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={() => reset()} className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-on-accent">Try again</button>
        <Link href="/" className="rounded-sm border border-line px-4 py-2 text-sm">Home</Link>
      </div>
      </main>
    </div>
  );
}
