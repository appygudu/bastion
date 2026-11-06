"use client";

import { useEffect, useMemo, useState } from "react";
import { ExposureChecklist } from "@/components/exposure-checklist";
import { SkeletonBlock } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { Advisory, AdvisorySeverity } from "@/lib/exposure/advisories";
import type { PublicBreach } from "@/lib/exposure/email";
import { countInRange, looksLikePwnedRange, pwnedRangeParts, pwnedRangeUrl, sha1HexSync, strengthTips } from "@/lib/exposure/password";
import { EXPOSURE_DISCLAIMER } from "@/lib/exposure/copy";
import { cn } from "@/lib/cn";

type Status = "idle" | "loading" | "ready" | "error";

interface EmailResult {
  breaches: PublicBreach[];
  total: number;
  truncated: boolean;
  sources: string[];
  warnings: string[];
  disclaimer: string;
}

interface DomainResult {
  domain: string;
  breaches: PublicBreach[];
  scan: { status: "skipped" } | { status: "completed"; score: number; hints: { id: string; severity: string; title: string; evidence: string }[] } | { status: "blocked" | "failed"; message: string };
  disclaimer: string;
}

interface Feed {
  items: Advisory[];
  updatedAt: string | null;
  catalogReleased: string | null;
  stale: boolean;
  warnings: string[];
  error: string | null;
  disclaimer?: string;
}

const SEVERITIES: Array<AdvisorySeverity | "all"> = ["all", "critical", "high", "medium", "low"];

function sha1Hex(password: string): string {
  return sha1HexSync(password);
}

async function loadRange(prefix: string): Promise<string> {
  try {
    const direct = await fetch(pwnedRangeUrl(prefix), { headers: { "Add-Padding": "true" } });
    if (direct.ok) {
      const text = await direct.text();
      if (looksLikePwnedRange(text)) return text;
    }
  } catch {
    // The browser call can fail on CSP, CORS, or a network block. The fallback sends only the prefix.
  }
  const response = await fetch("/api/exposure/password-range", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prefix }),
  });
  const data = await response.json().catch(() => null) as { range?: unknown; error?: string } | null;
  if (!response.ok || typeof data?.range !== "string" || !looksLikePwnedRange(data.range)) throw new Error("range");
  return data.range;
}

function Honeypot() {
  return (
    <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true">
      <label>
        Website
        <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

function BreachList({ breaches, empty }: { breaches: PublicBreach[]; empty: string }) {
  if (breaches.length === 0) {
    return <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">{empty}</p>;
  }
  return (
    <ul className="space-y-3">
      {breaches.map((breach) => (
        <li key={`${breach.source}-${breach.name}-${breach.date}`} className="rounded-md border border-line bg-ink-2 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-serif text-xl text-paper">{breach.name}</h3>
            <p className="text-xs text-muted">{breach.date ?? "Date not provided"} · {breach.source}</p>
          </div>
          {breach.domain ? <p className="mt-1 text-xs text-muted">{breach.domain}</p> : null}
          {breach.dataClasses.length ? (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Data classes">
              {breach.dataClasses.map((label) => (
                <li key={label} className="rounded-full border border-line px-2 py-1 text-xs text-paper">{label}</li>
              ))}
            </ul>
          ) : <p className="mt-2 text-xs text-muted">The source did not list data classes.</p>}
          <p className="mt-2 text-xs text-muted">
            {breach.passwordStorage ? `${breach.passwordStorage}. ` : ""}
            {breach.records != null ? `${breach.records.toLocaleString("en-US")} records reported. ` : ""}
            {breach.sourceUrl ? <a className="text-brass underline" href={breach.sourceUrl}>Source</a> : "No source link was provided."}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function ExposureChecker() {
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<Status>("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailResult, setEmailResult] = useState<EmailResult | null>(null);

  const [password, setPassword] = useState("");
  const [passwordState, setPasswordState] = useState<Status>("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pwnedCount, setPwnedCount] = useState<number | null>(null);

  const [domain, setDomain] = useState("");
  const [scan, setScan] = useState(false);
  const [attested, setAttested] = useState(false);
  const [domainState, setDomainState] = useState<Status>("idle");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainResult, setDomainResult] = useState<DomainResult | null>(null);

  const [feedState, setFeedState] = useState<Status>("loading");
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [aiOnly, setAiOnly] = useState(false);
  const [severity, setSeverity] = useState<AdvisorySeverity | "all">("all");
  const [pkgEco, setPkgEco] = useState<"npm" | "PyPI">("npm");
  const [pkgName, setPkgName] = useState("");
  const [pkgState, setPkgState] = useState<Status>("idle");
  const [pkgError, setPkgError] = useState<string | null>(null);
  const [pkgHits, setPkgHits] = useState<Advisory[] | null>(null);

  const hasResult = emailResult != null || pwnedCount != null || domainResult != null || pkgHits != null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/exposure/advisories");
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setFeedState("error");
          setFeedError(data.error ?? "Advisories could not be loaded.");
          return;
        }
        setFeed(data as Feed);
        setFeedState(data.error ? "error" : "ready");
        setFeedError(data.error ?? null);
      } catch {
        if (!cancelled) {
          setFeedState("error");
          setFeedError("Advisories could not be loaded.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleAdvisories = useMemo(() => {
    return (feed?.items ?? []).filter((item) => {
      if (aiOnly && !item.aiRelated) return false;
      if (severity !== "all" && item.severity !== severity) return false;
      return true;
    });
  }, [feed, aiOnly, severity]);

  async function onEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailState("loading");
    setEmailError(null);
    const website = String(new FormData(event.currentTarget).get("website") ?? "");
    const response = await fetch("/api/exposure/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, website }),
    });
    const data = await response.json();
    if (!response.ok) {
      setEmailState("error");
      setEmailError(data.error ?? "The lookup failed.");
      return;
    }
    setEmailResult(data as EmailResult);
    setEmailState("ready");
  }

  async function onPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordState("loading");
    setPasswordError(null);
    setPwnedCount(null);
    try {
      const parts = pwnedRangeParts(sha1Hex(password));
      const count = countInRange(await loadRange(parts.prefix), parts.suffix);
      setPwnedCount(count);
      setPasswordState("ready");
    } catch (error) {
      setPasswordState("error");
      setPasswordError(error instanceof Error && error.message === "hash" ? "This browser could not hash the password locally." : "The Pwned Passwords range API could not be reached from this browser or from Bastion. The password was not sent.");
    }
  }

  async function onDomain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (scan && !attested) {
      setDomainState("error");
      setDomainError("Passive hints run only after you attest ownership or written authority.");
      return;
    }
    setDomainState("loading");
    setDomainError(null);
    const website = String(new FormData(event.currentTarget).get("website") ?? "");
    const response = await fetch("/api/exposure/domain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domain, scan, attested: scan ? attested : false, website }),
    });
    const data = await response.json();
    if (!response.ok) {
      setDomainState("error");
      setDomainError(data.error ?? "The domain check failed.");
      return;
    }
    setDomainResult(data as DomainResult);
    setDomainState("ready");
  }

  async function onPackage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPkgState("loading");
    setPkgError(null);
    const website = String(new FormData(event.currentTarget).get("website") ?? "");
    const response = await fetch("/api/exposure/package", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ecosystem: pkgEco, name: pkgName, website }),
    });
    const data = await response.json();
    if (!response.ok) {
      setPkgState("error");
      setPkgError(data.error ?? "The package check failed.");
      return;
    }
    setPkgHits(data.advisories as Advisory[]);
    setPkgState("ready");
  }

  return (
    <div className="space-y-10">
      <p className="rounded-md border border-line bg-ink-2 px-4 py-3 text-sm text-muted" role="note">{EXPOSURE_DISCLAIMER}</p>

      <section className="space-y-4" aria-labelledby="email-check-title">
        <div>
          <h2 id="email-check-title" className="font-serif text-3xl">Email</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            The address is sent to this server only to ask XposedOrNot, and Have I Been Pwned when <span className="font-mono text-paper">HIBP_API_KEY</span> is set. It is not stored. Rate-limit keys are a hash. Results list breach names, dates, and data classes, not leaked values.
          </p>
        </div>
        <form onSubmit={onEmail} className="relative space-y-3 rounded-md border border-line bg-ink-2 p-4">
          <Honeypot />
          <label className="block text-sm">
            Email address
            <Field type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2" />
          </label>
          <Button type="submit" disabled={emailState === "loading"}>{emailState === "loading" ? "Checking…" : "Check email"}</Button>
        </form>
        {emailState === "loading" ? <SkeletonBlock className="h-24" /> : null}
        {emailError ? <p className="text-sm text-clay" role="alert">{emailError}</p> : null}
        {emailResult ? (
          <div aria-live="polite" className="space-y-3">
            <p className="text-sm text-muted">
              {emailResult.total === 0 ? "No breach records came back from the sources that were queried." : `${emailResult.total} breach record${emailResult.total === 1 ? "" : "s"} from ${emailResult.sources.join(" and ")}.`}
              {emailResult.truncated ? " The first 40 are shown." : ""}
            </p>
            {emailResult.warnings.map((warning) => <p key={warning} className="text-sm text-amber">{warning}</p>)}
            <BreachList breaches={emailResult.breaches} empty="No names were returned. That is not proof the address is safe." />
          </div>
        ) : null}
      </section>

      <section className="space-y-4" aria-labelledby="password-check-title">
        <div>
          <h2 id="password-check-title" className="font-serif text-3xl">Password</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            The password is hashed in this browser with SHA-1. Only the first five characters of that digest are sent. If the browser cannot reach the Pwned Passwords range API, Bastion requests that same five-character prefix and the suffix is compared here. The password and the full hash are not sent.
          </p>
        </div>
        <form onSubmit={onPassword} className="space-y-3 rounded-md border border-line bg-ink-2 p-4">
          <label className="block text-sm">
            Password
            <Field type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2" />
          </label>
          <Button type="submit" disabled={passwordState === "loading"}>{passwordState === "loading" ? "Checking…" : "Check password"}</Button>
        </form>
        {passwordError ? <p className="text-sm text-clay" role="alert">{passwordError}</p> : null}
        {passwordState === "ready" && pwnedCount != null ? (
          <div aria-live="polite" className="space-y-3 rounded-md border border-line p-4">
            <p className="text-sm text-paper">
              {pwnedCount > 0
                ? `Seen ${pwnedCount.toLocaleString("en-US")} time${pwnedCount === 1 ? "" : "s"} in the Pwned Passwords corpus.`
                : "Not found in the Pwned Passwords corpus. That is not proof this password is safe."}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {strengthTips(password, pwnedCount).map((tip) => <li key={tip}>{tip}</li>)}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="space-y-4" aria-labelledby="domain-check-title">
        <div>
          <h2 id="domain-check-title" className="font-serif text-3xl">Domain</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Known breaches come from the public XposedOrNot catalog for that domain. They are not a list of your employees. Passive hints contact the host only from a signed-in workspace that is not the public demo, and only after you attest authority. Private and metadata addresses are refused.
          </p>
        </div>
        <form onSubmit={onDomain} className="relative space-y-3 rounded-md border border-line bg-ink-2 p-4">
          <Honeypot />
          <label className="block text-sm">
            Domain
            <Field required placeholder="example.com" value={domain} onChange={(event) => setDomain(event.target.value)} className="mt-2" />
          </label>
          <label className="flex items-start gap-3 text-sm text-muted">
            <input type="checkbox" checked={scan} onChange={(event) => setScan(event.target.checked)} className="mt-1" />
            <span>Also run passive exposure hints against https:// this domain.</span>
          </label>
          {scan ? (
            <label className="flex items-start gap-3 text-sm text-muted">
              <input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} className="mt-1" />
              <span>I own this host or I have written authority to assess it. Bastion will send a small number of read-only requests.</span>
            </label>
          ) : null}
          <Button type="submit" disabled={domainState === "loading" || (scan && !attested)}>{domainState === "loading" ? "Checking…" : "Check domain"}</Button>
          {domainState === "loading" && scan ? <p className="text-xs text-muted">The passive check can take up to a minute.</p> : null}
        </form>
        {domainState === "loading" ? <SkeletonBlock className="h-24" /> : null}
        {domainError ? <p className="text-sm text-clay" role="alert">{domainError}</p> : null}
        {domainResult ? (
          <div aria-live="polite" className="space-y-3">
            <BreachList breaches={domainResult.breaches} empty="The catalog returned no breach for this domain. That is not proof the organisation is unaffected." />
            {domainResult.scan.status === "skipped" ? <p className="text-sm text-muted">Passive hints were not requested.</p> : null}
            {domainResult.scan.status === "completed" ? (
              <div className="rounded-md border border-line p-4">
                <p className="text-sm text-paper">Passive score {domainResult.scan.score}. This is the same weighted heuristic as a workspace scan, not a certification.</p>
                {domainResult.scan.hints.length === 0 ? <p className="mt-2 text-sm text-muted">No critical, high, or medium hints on this pass.</p> : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {domainResult.scan.hints.map((hint) => (
                      <li key={hint.id}>
                        <span className={cn("text-[11px] uppercase", `sev-${hint.severity}`)}>{hint.severity}</span>
                        <span className="ml-2 text-paper">{hint.title}</span>
                        <p className="text-xs text-muted">{hint.evidence}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
            {domainResult.scan.status === "blocked" || domainResult.scan.status === "failed" ? (
              <p className="text-sm text-clay" role="alert">{domainResult.scan.message}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-4" aria-labelledby="tracker-title">
        <div>
          <h2 id="tracker-title" className="font-serif text-3xl">Recent attack tracker</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Items are fetched from the CISA Known Exploited Vulnerabilities catalog and from OSV.dev records for a fixed list of AI and agent packages. Nothing on this list is typed in by hand. Ransomware use noted by CISA is shown as critical. Other KEV entries are shown as high because CISA has listed them as exploited.
          </p>
          {feed?.updatedAt ? <p className="mt-2 text-xs text-muted">Last updated {feed.updatedAt}{feed.catalogReleased ? ` · CISA catalog ${feed.catalogReleased}` : ""}{feed.stale ? " · showing the previous successful fetch" : ""}</p> : null}
        </div>
        {feedState === "loading" ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading advisories">
            <SkeletonBlock className="h-8 w-48" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
        ) : null}
        {feedError ? <p className="text-sm text-clay" role="alert">{feedError}</p> : null}
        {feed?.warnings.map((warning) => <p key={warning} className="text-sm text-amber">{warning}</p>)}
        {feedState === "ready" ? (
          <>
            <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Advisory filters">
              <button type="button" aria-pressed={aiOnly} onClick={() => setAiOnly((value) => !value)} className={cn("rounded-full border px-3 py-1 text-xs", aiOnly ? "border-brass text-brass" : "border-line text-muted")}>AI, LLM, and agent</button>
              {SEVERITIES.map((item) => (
                <button key={item} type="button" aria-pressed={severity === item} onClick={() => setSeverity(item)} className={cn("rounded-full border px-3 py-1 text-xs capitalize", severity === item ? "border-brass text-brass" : "border-line text-muted")}>{item}</button>
              ))}
            </div>
            {visibleAdvisories.length === 0 ? (
              <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">No fetched advisory matches this filter.</p>
            ) : (
              <ul className="space-y-3">
                {visibleAdvisories.map((item) => (
                  <li key={`${item.source}-${item.id}`} className="rounded-md border border-line p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-base text-paper">{item.title}</h3>
                      <p className="text-xs text-muted">{item.date}</p>
                    </div>
                    <p className="mt-1 text-xs">
                      <span className={cn("uppercase", item.severity === "unknown" ? "text-muted" : `sev-${item.severity}`)}>{item.severity}</span>
                      <span className="text-muted"> · {item.id}{item.aiRelated ? " · AI, LLM, or agent keyword" : ""}</span>
                    </p>
                    <p className="mt-2 text-sm text-muted">{item.summary}</p>
                    {item.action ? <p className="mt-2 text-sm text-paper">{item.action}</p> : null}
                    <a className="mt-2 inline-block text-sm text-brass underline" href={item.sourceUrl}>{item.source}</a>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}

        <form onSubmit={onPackage} className="relative space-y-3 rounded-md border border-line bg-ink-2 p-4">
          <Honeypot />
          <h3 className="font-serif text-xl">Am I using this?</h3>
          <p className="text-sm text-muted">Ask OSV.dev about one npm or PyPI package name. The answer is the records OSV returns, with their links and dates.</p>
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <label className="block text-sm">
              Ecosystem
              <select value={pkgEco} onChange={(event) => setPkgEco(event.target.value === "PyPI" ? "PyPI" : "npm")} className="mt-2 h-11 w-full rounded-sm border border-line bg-ink px-3 text-sm text-paper">
                <option value="npm">npm</option>
                <option value="PyPI">PyPI</option>
              </select>
            </label>
            <label className="block text-sm">
              Package name
              <Field required placeholder="langchain" value={pkgName} onChange={(event) => setPkgName(event.target.value)} className="mt-2" />
            </label>
          </div>
          <Button type="submit" disabled={pkgState === "loading"}>{pkgState === "loading" ? "Asking OSV…" : "Check package"}</Button>
        </form>
        {pkgState === "loading" ? <SkeletonBlock className="h-16" /> : null}
        {pkgError ? <p className="text-sm text-clay" role="alert">{pkgError}</p> : null}
        {pkgHits ? (
          pkgHits.length === 0 ? <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">OSV returned no advisory with a published date for that name. That is not proof the package is safe.</p> : (
            <ul className="space-y-2" aria-live="polite">
              {pkgHits.map((item) => (
                <li key={item.id} className="rounded-sm border border-line px-3 py-2 text-sm">
                  <a className="text-brass underline" href={item.sourceUrl}>{item.id}</a>
                  <span className="text-muted"> · {item.date} · {item.severity}</span>
                  <p className="text-muted">{item.summary}</p>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      <ExposureChecklist emphasized={hasResult} />
    </div>
  );
}
