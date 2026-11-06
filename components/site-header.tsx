"use client";

import Link from "next/link";
import { Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";

export function SiteHeader({ cta = "workspace" }: { cta?: "workspace" | "signin" }) {
  return (
    <header className="relative sticky top-0 z-30 border-b border-line/80 bg-ink/85 backdrop-blur">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-ink-2 focus:px-3 focus:py-2">Skip to content</a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-3 sm:px-5">
        <Link href="/" aria-label="Bastion home"><Wordmark /></Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 text-sm" aria-label="Primary">
          <Link href="/threats" className="rounded-sm px-2 py-1 text-muted hover:text-paper">Global attacks</Link>
          <Link href="/exposure" className="rounded-sm px-2 py-1 text-muted hover:text-paper">Exposure</Link>
          <Link href="/pricing" className="rounded-sm px-2 py-1 text-muted hover:text-paper">Pricing</Link>
          <Link href="/docs" className="rounded-sm px-2 py-1 text-muted hover:text-paper">Docs</Link>
          <ThemeToggle />
          {cta === "signin" ? (
            <Link href="/login" className="rounded-sm px-2 py-1 text-muted hover:text-paper">Sign in</Link>
          ) : (
            <>
              <Link href="/login" className="rounded-sm px-2 py-1 text-muted hover:text-paper">Sign in</Link>
              <Link href="/login" className="rounded-sm bg-brass px-3 py-2 text-sm font-medium text-on-accent"><span className="min-[380px]:hidden">Demo</span><span className="hidden min-[380px]:inline">Try the live demo</span></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
