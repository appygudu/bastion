"use client";

import { useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { useToast } from "@/components/toast";
import type { Finding, Pass, Severity } from "@/lib/types";
import { cn } from "@/lib/cn";

const LEVELS: Severity[] = ["critical", "high", "medium", "low", "info"];

export function FindingExplorer({ findings, passes }: { findings: Finding[]; passes: Pass[] }) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<Severity | "all">("all");
  const [open, setOpen] = useState<string | null>(findings.find((item) => item.severity === "critical" || item.severity === "high")?.id ?? null);
  const toast = useToast();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return findings.filter((finding) => {
      if (level !== "all" && finding.severity !== level) return false;
      if (!needle) return true;
      return `${finding.title} ${finding.evidence} ${finding.category} ${finding.owasp.join(" ")}`.toLowerCase().includes(needle);
    });
  }, [findings, query, level]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(visible, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bastion-findings.json";
    link.click();
    URL.revokeObjectURL(url);
    toast("Exported the visible findings as JSON.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="block min-w-0 flex-1 text-sm">
          <span className="sr-only">Search findings</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, evidence, or OWASP id"
            className="h-10 w-full rounded-sm border border-line bg-ink px-3 text-sm text-paper placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          />
        </label>
        <button type="button" onClick={exportJson} className="h-10 rounded-sm border border-line px-3 text-sm text-brass">Export JSON</button>
      </div>
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Severity filter">
        <Chip active={level === "all"} onClick={() => setLevel("all")}>All {findings.length}</Chip>
        {LEVELS.map((item) => {
          const count = findings.filter((finding) => finding.severity === item).length;
          if (!count) return null;
          return <Chip key={item} active={level === item} onClick={() => setLevel(item)}>{item} {count}</Chip>;
        })}
      </div>
      {visible.length === 0 ? (
        <p className="border border-dashed border-line p-6 text-sm text-muted">{findings.length === 0 ? "No findings on this pass." : "No findings match this filter."}</p>
      ) : (
        <div className="space-y-3">
          {visible.map((finding) => {
            const expanded = open === finding.id;
            return (
              <article key={finding.id} id={finding.id} className="rounded-md border border-line bg-ink-2">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : finding.id)}
                >
                  <span>
                    <span className={cn("text-[11px] uppercase tracking-wider", `sev-${finding.severity}`)}>{finding.severity}</span>
                    <span className="mt-1 block text-base text-paper">{finding.title}</span>
                  </span>
                  <span className="text-xs text-muted">{expanded ? "Hide" : "Remediation"}</span>
                </button>
                {expanded ? (
                  <div className="space-y-3 border-t border-line px-4 py-3">
                    <p className="text-xs text-muted">{finding.owasp.join(" · ")} · {finding.nistCsf.join(", ")}</p>
                    <p className="text-sm">{finding.evidence}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wider text-muted">Fix</p>
                      <CopyButton text={finding.fix} />
                    </div>
                    <pre className="overflow-x-auto rounded-sm bg-ink p-3 font-mono text-xs text-muted">{finding.fix}</pre>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      {passes.length ? (
        <section>
          <h2 className="font-serif text-2xl">Observed controls</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {passes.map((pass) => (
              <li key={pass.id} className="rounded-sm border border-line px-3 py-2"><span className="text-sage">{pass.title}.</span> <span className="text-muted">{pass.evidence}</span></li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("rounded-full border px-3 py-1 text-xs capitalize", active ? "border-brass bg-brass/15 text-brass" : "border-line text-muted")}
    >
      {children}
    </button>
  );
}
