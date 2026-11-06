"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  ["/app", "Overview"],
  ["/app/scan", "Scanner"],
  ["/app/dependencies", "Dependencies"],
  ["/app/ledger", "Ledger"],
  ["/app/policies", "Policies"],
  ["/app/agents", "Agents"],
  ["/app/reports", "Reports"],
  ["/app/team", "Team"],
  ["/app/developers", "Developers"],
  ["/app/billing", "Billing"],
  ["/app/settings", "Settings"],
  ["/exposure", "Exposure"],
  ["/threats", "Threats"],
];

export function AppNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Workspace">
      {links.map(([href, label]) => {
        const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            title={label}
            className={cn(
              "whitespace-nowrap rounded-sm px-3 py-2 text-sm",
              active ? "bg-brass/15 text-brass" : "text-muted hover:bg-panel hover:text-paper",
              collapsed && "md:px-2 md:text-center",
            )}
          >
            <span className={collapsed ? "md:sr-only" : undefined}>{label}</span>
            {collapsed ? <span className="hidden md:inline" aria-hidden="true">{label.slice(0, 1)}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
