"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ThreatDetail } from "@/components/threat-detail";
import { SkeletonBlock } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { THREAT_NOTE } from "@/lib/threats/copy";
import {
  filterIncidents,
  incidentsToCsv,
  THREAT_SECTORS,
  type ThreatFeed,
  type ThreatIncident,
  type ThreatSeverity,
} from "@/lib/threats/model";

const RANGES: { id: string; label: string; days: number | null }[] = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "180", label: "180 days", days: 180 },
  { id: "all", label: "All fetched", days: null },
];

const SEVERITIES: (ThreatSeverity | "all")[] = ["all", "critical", "high", "medium", "low", "unknown"];

type FeedResponse = ThreatFeed & { note?: string };

export function ThreatsBoard() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [rangeDays, setRangeDays] = useState<number | null>(null);
  const [severity, setSeverity] = useState<ThreatSeverity | "all">("all");
  const [sector, setSector] = useState("all");
  const [aiOnly, setAiOnly] = useState(false);
  const [exploitedOnly, setExploitedOnly] = useState(false);
  const [view, setView] = useState<"list" | "timeline">("list");
  const [selected, setSelected] = useState<ThreatIncident | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchId = useId();

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    fetch("/api/threats", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as (FeedResponse & { error?: string }) | null;
        if (!response.ok) throw new Error(payload?.error || "The threat feed could not be loaded.");
        if (!payload || !Array.isArray(payload.items)) throw new Error("The threat feed returned an unreadable response.");
        setFeed(payload);
        setState("ready");
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "The threat feed could not be loaded.");
        setState("error");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selected && !dialog.open) dialog.showModal();
    if (!selected && dialog.open) dialog.close();
  }, [selected]);

  const visible = useMemo(
    () => filterIncidents(feed?.items ?? [], { q: query, rangeDays, severity, sector, ai: aiOnly, exploited: exploitedOnly }),
    [feed, query, rangeDays, severity, sector, aiOnly, exploitedOnly],
  );

  const groups = useMemo(() => {
    const rows: { date: string; items: ThreatIncident[] }[] = [];
    for (const item of visible) {
      const last = rows.at(-1);
      if (last?.date === item.date) last.items.push(item);
      else rows.push({ date: item.date, items: [item] });
    }
    return rows;
  }, [visible]);

  function exportJson() {
    const body = JSON.stringify({
      exportedAt: new Date().toISOString(),
      updatedAt: feed?.updatedAt ?? null,
      note: feed?.note ?? THREAT_NOTE,
      items: visible,
    }, null, 2);
    download("bastion-threats.json", body, "application/json");
  }

  function exportCsv() {
    download("bastion-threats.csv", incidentsToCsv(visible), "text/csv");
  }

  return (
    <div className="space-y-6">
      <p className="text-sm leading-6 text-muted">{THREAT_NOTE}</p>
      {state === "loading" ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading threat records">
          <SkeletonBlock className="h-10" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      ) : null}
      {state === "error" ? <p className="text-sm text-clay" role="alert">{error}</p> : null}
      {feed?.stale ? <p className="text-sm text-amber">Showing the last successful fetch. A later refresh did not complete.</p> : null}
      {feed?.warnings.map((warning) => <p key={warning} className="text-sm text-amber">{warning}</p>)}
      {feed?.error ? <p className="text-sm text-clay" role="alert">{feed.error}</p> : null}
      {feed?.updatedAt ? (
        <p className="text-xs text-muted">Last updated <time dateTime={feed.updatedAt}>{formatStamp(feed.updatedAt)}</time>{feed.stale ? " · previous successful fetch" : ""}</p>
      ) : null}

      {feed ? (
        <section aria-labelledby="threat-source-status">
          <h2 id="threat-source-status" className="font-serif text-2xl">Sources</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {feed.sources.map((source) => (
              <li key={source.id} className="rounded-md border border-line bg-ink-2 p-3 text-sm">
                <a className="text-brass underline" href={source.url} target="_blank" rel="noreferrer">{source.name}<span className="sr-only"> (opens the source site)</span></a>
                <p className="mt-1 text-muted">{source.ok ? `${source.count} records read` : `Unavailable. ${source.error ?? ""}`}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {state === "ready" && feed ? (
        <>
          <div className="space-y-3">
            <label className="block text-sm text-muted" htmlFor={searchId}>Search titles, products, and identifiers</label>
            <Field id={searchId} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="CVE, product, or phrase from the source" />
            <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Time range">
              {RANGES.map((range) => (
                <FilterChip key={range.id} pressed={rangeDays === range.days} onClick={() => setRangeDays(range.days)}>{range.label}</FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Severity">
              {SEVERITIES.map((item) => (
                <FilterChip key={item} pressed={severity === item} onClick={() => setSeverity(item)} className="capitalize">{item === "all" ? "All severities" : item}</FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Sector">
              <FilterChip pressed={sector === "all"} onClick={() => setSector("all")}>All sectors</FilterChip>
              {THREAT_SECTORS.map((item) => (
                <FilterChip key={item} pressed={sector === item} onClick={() => setSector(item)}>{item}</FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Record type">
              <FilterChip pressed={aiOnly} onClick={() => setAiOnly((value) => !value)}>AI, LLM, and agent</FilterChip>
              <FilterChip pressed={exploitedOnly} onClick={() => setExploitedOnly((value) => !value)}>Exploited in the wild</FilterChip>
              <FilterChip pressed={view === "list"} onClick={() => setView("list")}>List</FilterChip>
              <FilterChip pressed={view === "timeline"} onClick={() => setView("timeline")}>Timeline</FilterChip>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="quiet" size="sm" onClick={exportJson} disabled={visible.length === 0}>Export JSON</Button>
              <Button type="button" variant="quiet" size="sm" onClick={exportCsv} disabled={visible.length === 0}>Export CSV</Button>
            </div>
          </div>
          <p className="text-sm text-muted" aria-live="polite">
            {visible.length} of {feed.items.length} fetched records. The list is capped at {feed.cap} after duplicate identifiers are merged. It is not every attack in the world.
          </p>
          {visible.length === 0 ? (
            <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">No fetched record matches these filters.</p>
          ) : view === "timeline" ? (
            <ol className="space-y-6 border-l border-line pl-4">
              {groups.map((group) => (
                <li key={group.date}>
                  <p className="font-mono text-xs text-brass"><time dateTime={group.date}>{group.date}</time></p>
                  <ul className="mt-2 space-y-3">
                    {group.items.map((item) => <IncidentCard key={item.id} item={item} onOpen={() => setSelected(item)} />)}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <ul className="space-y-3">
              {visible.map((item) => <IncidentCard key={item.id} item={item} onOpen={() => setSelected(item)} />)}
            </ul>
          )}
        </>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby="threat-title"
        className="w-[min(100vw-1.5rem,44rem)] max-h-[85vh] overflow-y-auto rounded-md border border-line bg-ink p-4 text-paper shadow-[var(--shadow)] backdrop:bg-black/60 sm:p-6"
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Link className="text-sm text-brass underline" href={`/threats/${encodeURIComponent(selected.id)}`}>Open as a page</Link>
              <Button type="button" variant="quiet" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
            <ThreatDetail incident={selected} />
          </>
        ) : null}
      </dialog>
    </div>
  );
}

function IncidentCard({ item, onOpen }: { item: ThreatIncident; onOpen: () => void }) {
  const primary = item.links[0];
  return (
    <li className="rounded-md border border-line bg-ink-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base text-paper">
          <button type="button" className="text-left underline decoration-line underline-offset-4 hover:decoration-brass" onClick={onOpen}>{item.title}</button>
        </h3>
        <p className="text-xs text-muted"><time dateTime={item.date}>{item.date}</time></p>
      </div>
      <p className="mt-1 text-xs">
        <span className={item.severity === "unknown" ? "uppercase text-muted" : `uppercase sev-${item.severity}`}>{item.severity}</span>
        <span className="text-muted"> · {item.id}{item.exploited ? " · exploited in the wild" : ""}{item.aiRelated ? " · AI, LLM, or agent keyword" : ""}</span>
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">{item.summary.slice(0, 280)}{item.summary.length > 280 ? "…" : ""}</p>
      {item.products.length ? <p className="mt-2 text-xs text-muted">Affected: {item.products.join(", ")}</p> : null}
      <p className="mt-3 flex flex-wrap gap-3 text-xs">
        {primary ? <a className="text-brass underline" href={primary.url} target="_blank" rel="noreferrer">{primary.label}</a> : null}
        <Link className="text-brass underline" href={`/threats/${encodeURIComponent(item.id)}`}>Detail page</Link>
      </p>
    </li>
  );
}

function FilterChip({ pressed, onClick, children, className }: { pressed: boolean; onClick: () => void; children: string; className?: string }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={cn("rounded-full border px-3 py-1 text-xs", pressed ? "border-brass text-brass" : "border-line text-muted", className)}>
      {children}
    </button>
  );
}

function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date)} UTC`;
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
