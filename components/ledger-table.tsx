"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

export interface LedgerRow {
  id: string;
  occurredAt: string;
  method: string;
  path: string;
  status: number | null;
  ip: string;
  agent: string;
  category: string;
  source: string;
  userAgent: string;
  anomalies: { code: string; severity: string; detail: string }[];
}

export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  const [query, setQuery] = useState("");
  const [onlyAnomalies, setOnlyAnomalies] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (onlyAnomalies && row.anomalies.length === 0) return false;
      if (!needle) return true;
      return `${row.path} ${row.agent} ${row.category} ${row.ip} ${row.userAgent} ${row.anomalies.map((item) => item.code).join(" ")}`.toLowerCase().includes(needle);
    });
  }, [rows, query, onlyAnomalies]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search path, actor, IP, or anomaly"
          aria-label="Search ledger"
          className="h-10 min-w-0 flex-1 rounded-sm border border-line bg-ink px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        />
        <button
          type="button"
          aria-pressed={onlyAnomalies}
          onClick={() => setOnlyAnomalies((value) => !value)}
          className={cn("h-10 rounded-sm border px-3 text-sm", onlyAnomalies ? "border-brass text-brass" : "border-line text-muted")}
        >
          Anomalies only
        </button>
      </div>
      <p className="text-xs text-muted">{visible.length} of {rows.length} shown on this page. Chain verification still covers every stored row.</p>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-ink-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Request</th>
              <th className="px-3 py-2 font-medium">Actor</th>
              <th className="px-3 py-2 font-medium">Anomalies</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-6 text-muted">No rows match this filter.</td></tr>
            ) : visible.map((event) => (
              <tr key={event.id} className="border-t border-line align-top">
                <td className="px-3 py-2 font-mono text-[11px] text-muted">{event.occurredAt.slice(0, 19)}Z</td>
                <td className="px-3 py-2">{event.method} {event.path}<div className="text-xs text-muted">{event.status ?? "—"} · {event.ip} · {event.source}</div></td>
                <td className="px-3 py-2">
                  <button type="button" className="text-left" aria-expanded={open === event.id} onClick={() => setOpen(open === event.id ? null : event.id)}>
                    {event.agent || event.category}
                    <div className="max-w-xs truncate text-xs text-muted">{open === event.id ? event.userAgent : event.userAgent.slice(0, 72)}</div>
                  </button>
                </td>
                <td className="px-3 py-2 text-xs">
                  {event.anomalies.length ? event.anomalies.map((item) => (
                    <p key={item.code}><span className={cn("uppercase", `sev-${item.severity}`)}>{item.code}</span> — {item.detail}</p>
                  )) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
