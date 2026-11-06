"use client";

import Link from "next/link";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-md border border-line bg-ink-2 p-6" role="alert">
      <p className="text-[11px] uppercase tracking-[0.18em] text-clay">Could not load this view</p>
      <h1 className="mt-2 font-serif text-3xl">The page stopped before it finished.</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">
        The rest of the workspace is still available. Retry this view, or return to the overview. The server log holds the detail.
        {error.digest ? ` Reference ${error.digest}.` : ""}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-on-accent">
          Try again
        </button>
        <Link href="/app" className="rounded-sm border border-line px-4 py-2 text-sm">
          Overview
        </Link>
      </div>
    </div>
  );
}
