"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { LogoutButton } from "@/components/logout-button";
import { Mark, Wordmark } from "@/components/logo";
import { ThemeToggle, useTheme } from "@/components/theme";
import { cn } from "@/lib/cn";

const CRUMBS: { prefix: string; label: string; href: string }[] = [
  { prefix: "/app/scan", label: "Scanner", href: "/app/scan" },
  { prefix: "/app/dependencies", label: "Dependencies", href: "/app/dependencies" },
  { prefix: "/app/ledger", label: "Ledger", href: "/app/ledger" },
  { prefix: "/app/policies", label: "Policies", href: "/app/policies" },
  { prefix: "/app/agents", label: "Agents", href: "/app/agents" },
  { prefix: "/app/reports", label: "Reports", href: "/app/reports" },
  { prefix: "/app/team", label: "Team", href: "/app/team" },
  { prefix: "/app/developers", label: "Developers", href: "/app/developers" },
  { prefix: "/app/billing", label: "Billing", href: "/app/billing" },
  { prefix: "/app/notifications", label: "Notifications", href: "/app/notifications" },
  { prefix: "/app/admin", label: "Operator", href: "/app/admin" },
  { prefix: "/app/settings", label: "Settings", href: "/app/settings" },
  { prefix: "/exposure", label: "Exposure", href: "/exposure" },
  { prefix: "/threats", label: "Global attacks", href: "/threats" },
];

type Command = { id: string; label: string; hint: string; href?: string; run?: "theme" };

export function WorkspaceShell({
  orgName,
  email,
  isDemo,
  role,
  plan,
  unread,
  admin,
  children,
}: {
  orgName: string;
  email: string;
  isDemo: boolean;
  role: string;
  plan: string;
  unread: number;
  admin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCollapsed(localStorage.getItem("bastion-sidebar") === "collapsed");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const commands = useMemo<Command[]>(() => [
    { id: "overview", label: "Overview", hint: "Risk score and fix-first list", href: "/app" },
    { id: "scan", label: "Scanner", hint: "Passive checks on a host you own", href: "/app/scan" },
    { id: "deps", label: "Dependencies", hint: "OSV.dev review", href: "/app/dependencies" },
    { id: "ledger", label: "Ledger", hint: "AI crawlers and hash chain", href: "/app/ledger" },
    { id: "policies", label: "Policies", hint: "robots.txt, ai.txt, middleware", href: "/app/policies" },
    { id: "agents", label: "Agent log", hint: "Tool calls and LLM indicators", href: "/app/agents" },
    { id: "reports", label: "Reports", hint: "Executive brief", href: "/app/reports" },
    { id: "team", label: "Team", hint: "Roles, invitations, audit log", href: "/app/team" },
    { id: "developers", label: "Developers", hint: "API keys and webhooks", href: "/app/developers" },
    { id: "billing", label: "Billing", hint: "Plan and payment claims", href: "/app/billing" },
    { id: "notifications", label: "Notifications", hint: "Scan and plan notices", href: "/app/notifications" },
    { id: "settings", label: "Settings", hint: "Properties and ingest keys", href: "/app/settings" },
    ...(admin ? [{ id: "admin", label: "Operator", hint: "Approve claims and review requests", href: "/app/admin" } as Command] : []),
    { id: "exposure", label: "Exposure check", hint: "Breach, password, and advisory lookup", href: "/exposure" },
    { id: "threats", label: "Global attacks", hint: "Public advisories and exploited vulnerabilities", href: "/threats" },
    { id: "docs", label: "Product docs", hint: "How the controls behave", href: "/docs" },
    { id: "security", label: "Security notes", hint: "What this app will not do", href: "/security" },
    { id: "theme", label: "Toggle light and dark", hint: "Color theme", run: "theme" },
  ], [admin]);

  const filtered = commands.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((open) => !open);
        setQuery("");
        setActive(0);
      }
      if (event.key === "Escape") {
        setPalette(false);
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (palette) inputRef.current?.focus();
  }, [palette]);

  function choose(item: Command | undefined) {
    if (!item) return;
    setPalette(false);
    if (item.run === "theme") toggle();
    else if (item.href) router.push(item.href);
  }

  const section = CRUMBS.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
  const detail = section && pathname !== section.href;
  const rail = collapsed && !mobileOpen;

  return (
    <div className={cn("min-h-screen md:grid", collapsed ? "md:grid-cols-[72px_1fr]" : "md:grid-cols-[240px_1fr]")}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[90] focus:bg-ink-2 focus:px-3 focus:py-2">Skip to content</a>
      {mobileOpen ? (
        <button type="button" className="fixed inset-0 z-40 bg-black/50 md:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
      ) : null}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-ink-2 transition-transform md:static md:z-auto md:w-auto md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className={cn("flex items-center px-3 py-4", rail ? "justify-center" : "justify-between")}>
          <Link href="/app" aria-label="Workspace home">
            {rail ? <Mark className="h-5 w-5 text-brass" /> : <Wordmark compact />}
          </Link>
          <button
            type="button"
            className={cn("rounded-sm px-2 py-1 text-xs text-muted hover:text-paper", rail ? "hidden" : "hidden md:inline")}
            aria-label="Collapse sidebar"
            aria-expanded={!collapsed}
            aria-controls="workspace-nav"
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              localStorage.setItem("bastion-sidebar", next ? "collapsed" : "open");
            }}
          >
            <span aria-hidden="true">«</span>
          </button>
        </div>
        {rail ? (
          <div className="hidden px-2 pb-2 text-center md:block">
            <button
              type="button"
              className="rounded-sm px-2 py-1 text-xs text-muted hover:text-paper"
              aria-label="Expand sidebar"
              aria-expanded={false}
              aria-controls="workspace-nav"
              onClick={() => {
                setCollapsed(false);
                localStorage.setItem("bastion-sidebar", "open");
              }}
            >
              <span aria-hidden="true">»</span>
            </button>
          </div>
        ) : null}
        <div id="workspace-nav" className="px-2 pb-4">
          <AppNav collapsed={rail} />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-sm border border-line px-2 py-1 text-xs md:hidden" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>Menu</button>
              <nav aria-label="Breadcrumb" className="truncate text-xs text-muted">
                <ol className="flex items-center gap-1">
                  <li><Link href="/app" className="hover:text-paper">Overview</Link></li>
                  {section ? <li className="before:mr-1 before:content-['/']"><Link href={section.href} className="hover:text-paper">{section.label}</Link></li> : null}
                  {detail ? <li className="before:mr-1 before:content-['/']"><span className="text-paper">Detail</span></li> : null}
                </ol>
              </nav>
            </div>
            <p className="mt-1 truncate text-sm text-paper">{orgName} <span className="text-xs text-muted">· {email} · {role} · {plan === "team" ? "team" : "free"}{isDemo ? " · demo workspace" : ""}</span></p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => { setPalette(true); setQuery(""); setActive(0); }}
              className="inline-flex items-center gap-2 rounded-sm border border-line px-2 py-1.5 text-xs text-muted hover:text-paper"
            >
              Jump <kbd className="hidden rounded border border-line px-1 font-mono text-[10px] sm:inline">Ctrl K</kbd>
            </button>
            <Link href="/app/notifications" className="text-xs text-muted hover:text-paper">Inbox{unread > 0 ? ` ${unread}` : ""}</Link>
            <ThemeToggle />
            <Link href="/docs" className="hidden text-sm text-muted hover:text-paper sm:inline">Docs</Link>
            <LogoutButton />
          </div>
        </header>
        {isDemo ? (
          <p className="border-b border-brass/40 bg-brass/10 px-5 py-2 text-xs text-brass">
            Demo workspace, read-only. It cannot scan a host, create a property, or append ledger events. The Northwind records were seeded and labelled demo.
          </p>
        ) : null}
        <main id="main" className="px-4 py-6 sm:px-5">{children}</main>
      </div>
      {palette ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/55 px-4 pt-[12vh]" role="presentation" onMouseDown={() => setPalette(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="w-full max-w-lg overflow-hidden rounded-md border border-line bg-ink-2 shadow-[var(--shadow)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0); }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((index) => Math.max(index - 1, 0));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  choose(filtered[active]);
                }
              }}
              placeholder="Jump to a page or toggle the theme"
              className="w-full border-b border-line bg-transparent px-4 py-3 text-sm text-paper outline-none"
              aria-label="Command search"
            />
            <ul className="max-h-80 overflow-auto py-1" role="listbox">
              {filtered.length === 0 ? <li className="px-4 py-3 text-sm text-muted">No matching commands.</li> : null}
              {filtered.map((item, index) => (
                <li key={item.id} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    className={cn("flex w-full items-baseline justify-between px-4 py-2 text-left text-sm", index === active ? "bg-panel text-paper" : "text-muted")}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(item)}
                  >
                    <span className="text-paper">{item.label}</span>
                    <span className="text-xs">{item.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
