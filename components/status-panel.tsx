"use client";

import { useEffect, useState } from "react";

type Status = { ok?: boolean; database?: string; scheduler?: string; email?: string; sso?: string; time?: string; error?: string };
type Feed = { updatedAt?: string | null; stale?: boolean; error?: string | null; sources?: { name: string; ok: boolean; error: string | null }[] };

export function StatusPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [failed, setFailed] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/status", { signal: controller.signal }).then((response) => response.json()),
      fetch("/api/threats", { signal: controller.signal }).then((response) => response.json()),
    ]).then(([health, threats]) => {
      setStatus(health);
      setFeed(threats);
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFailed("The status check did not complete.");
    });
    return () => controller.abort();
  }, []);

  if (failed) return <p className="text-sm text-clay" role="alert">{failed}</p>;
  if (!status || !feed) return <p className="text-sm text-muted" aria-busy="true">Checking this deployment…</p>;
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-line bg-ink-2 p-4">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted">Application</dt>
          <dd className="mt-2 text-paper">{status.ok ? "Responding" : "Not responding"}</dd>
          {status.time ? <dd className="mt-1 text-xs text-muted"><time dateTime={status.time}>{status.time}</time></dd> : null}
        </div>
        <div className="rounded-md border border-line bg-ink-2 p-4">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted">Database</dt>
          <dd className="mt-2 text-paper">{status.database === "ok" ? "Query succeeded" : "Query failed"}</dd>
        </div>
        <div className="rounded-md border border-line bg-ink-2 p-4">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted">Weekly re-scan scheduler</dt>
          <dd className="mt-2 text-paper">{status.scheduler === "armed" ? "Armed" : "Not configured"}</dd>
        </div>
        <div className="rounded-md border border-line bg-ink-2 p-4">
          <dt className="text-xs uppercase tracking-[0.14em] text-muted">Email and SSO</dt>
          <dd className="mt-2 text-paper">Email {status.email === "configured" ? "configured" : "not configured"} · SSO {status.sso === "configured" ? "configured" : "not configured"}</dd>
        </div>
      </dl>
      <section>
        <h2 className="font-serif text-2xl text-paper">Threat feeds</h2>
        <p className="mt-2 text-sm text-muted">{feed.updatedAt ? <>Last successful fetch <time dateTime={feed.updatedAt}>{feed.updatedAt}</time>{feed.stale ? " · showing a previous fetch" : ""}</> : "No successful fetch is cached."}</p>
        {feed.error ? <p className="mt-2 text-sm text-clay" role="alert">{feed.error}</p> : null}
        <ul className="mt-3 space-y-2 text-sm">
          {(feed.sources ?? []).map((source) => (
            <li key={source.name} className="flex flex-wrap justify-between gap-2 border-b border-line py-2">
              <span className="text-paper">{source.name}</span>
              <span className="text-muted">{source.ok ? "Read" : `Unavailable. ${source.error ?? ""}`}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
