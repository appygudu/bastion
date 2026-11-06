import { readSnapshot, resetSnapshots, writeSnapshot } from "@/lib/cache/snapshot";
import { assertOutboundUrl, OutboundError } from "@/lib/security/outbound";
import {
  incidentsFromEuvd,
  incidentsFromGhsa,
  incidentsFromKev,
  incidentsFromNvd,
  incidentsFromRss,
  mergeIncidents,
  rssEntries,
} from "@/lib/threats/parse";
import type { ThreatFeed, ThreatIncident, ThreatSourceStatus } from "@/lib/threats/model";

const USER_AGENT = "Bastion/0.1 (defensive threat feed)";
const TTL_MS = 45 * 60 * 1000;
const CAP = 120;

type SourceKind = "kev" | "rss" | "ghsa" | "euvd" | "nvd";

interface SourceDef {
  id: string;
  name: string;
  kind: SourceKind;
  url: (now: number) => string;
  accept: string;
  timeoutMs: number;
  limit?: number;
  idPrefix?: string;
}

export function nvdWindowUrl(now = Date.now()): string {
  const end = new Date(now);
  const start = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const stamp = (date: Date) => date.toISOString().replace(/Z$/, "");
  const params = new URLSearchParams({
    resultsPerPage: "10",
    pubStartDate: stamp(start),
    pubEndDate: stamp(end),
  });
  return `https://services.nvd.nist.gov/rest/json/cves/2.0?${params.toString()}`;
}

const SOURCES: SourceDef[] = [
  {
    id: "cisa-kev",
    name: "CISA Known Exploited Vulnerabilities",
    kind: "kev",
    url: () => "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
    accept: "application/json",
    timeoutMs: 15_000,
    limit: 50,
  },
  {
    id: "ncsc",
    name: "NCSC UK reports",
    kind: "rss",
    url: () => "https://www.ncsc.gov.uk/api/1/services/v1/report-rss-feed.xml",
    accept: "application/rss+xml, application/xml, text/xml",
    timeoutMs: 12_000,
    limit: 20,
    idPrefix: "ncsc",
  },
  {
    id: "cisco",
    name: "Cisco Security Advisories",
    kind: "rss",
    url: () => "https://sec.cloudapps.cisco.com/security/center/psirtrss20/CiscoSecurityAdvisory.xml",
    accept: "application/rss+xml, application/xml, text/xml",
    timeoutMs: 12_000,
    limit: 15,
    idPrefix: "cisco",
  },
  {
    id: "msrc",
    name: "Microsoft Security Update Guide",
    kind: "rss",
    url: () => "https://api.msrc.microsoft.com/update-guide/rss",
    accept: "application/rss+xml, application/xml, text/xml",
    timeoutMs: 15_000,
    limit: 15,
    idPrefix: "msrc",
  },
  {
    id: "github",
    name: "GitHub Security Advisories",
    kind: "ghsa",
    url: () => "https://api.github.com/advisories?per_page=20&sort=published&direction=desc",
    accept: "application/vnd.github+json",
    timeoutMs: 12_000,
    limit: 20,
  },
  {
    id: "enisa",
    name: "ENISA European Vulnerability Database",
    kind: "euvd",
    url: () => "https://euvdservices.enisa.europa.eu/api/lastvulnerabilities",
    accept: "application/json",
    timeoutMs: 12_000,
  },
  {
    id: "cert-in",
    name: "CERT-In",
    kind: "rss",
    url: () => "https://www.cert-in.org.in/RSS/advisories/advisories.xml",
    accept: "application/rss+xml, application/xml, text/xml",
    timeoutMs: 5_000,
    limit: 20,
    idPrefix: "certin",
  },
  {
    id: "nvd",
    name: "NVD",
    kind: "nvd",
    url: nvdWindowUrl,
    accept: "application/json",
    timeoutMs: 12_000,
    limit: 10,
  },
];

class FeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedError";
  }
}

let cache: { at: number; feed: ThreatFeed } | null = null;

export function resetThreatCache() {
  cache = null;
  resetSnapshots();
}

function reviveFeed(value: unknown): ThreatFeed | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as ThreatFeed).items)) return null;
  return value as ThreatFeed;
}

export async function loadThreats(fetchImpl: typeof fetch = fetch, now = Date.now()): Promise<ThreatFeed> {
  if (cache && now - cache.at < TTL_MS) return cache.feed;
  const stored = await readSnapshot("threats", reviveFeed);
  if (stored && now - stored.fetchedAt < TTL_MS) {
    cache = { at: stored.fetchedAt, feed: stored.value };
    return stored.value;
  }
  const results = await Promise.all(SOURCES.map((source) => loadSource(source, fetchImpl, now)));
  const sources = results.map((result) => result.status);
  const warnings = results.flatMap((result) => (result.warning ? [result.warning] : []));
  const items = mergeIncidents(results.map((result) => result.items)).slice(0, CAP);
  if (items.length === 0) {
    const previous = stored?.value ?? cache?.feed ?? null;
    if (previous) {
      return { ...previous, stale: true, warnings: [...new Set([...previous.warnings, ...warnings])] };
    }
    return {
      items: [],
      updatedAt: null,
      stale: false,
      warnings,
      error: "Threat records could not be loaded from any source.",
      sources,
      cap: CAP,
    };
  }
  const feed: ThreatFeed = {
    items,
    updatedAt: new Date(now).toISOString(),
    stale: false,
    warnings,
    error: null,
    sources,
    cap: CAP,
  };
  cache = { at: now, feed };
  await writeSnapshot("threats", feed, now);
  return feed;
}

async function loadSource(source: SourceDef, fetchImpl: typeof fetch, now: number): Promise<{ status: ThreatSourceStatus; items: ThreatIncident[]; warning: string | null }> {
  const url = source.url(now);
  try {
    const body = await fetchText(fetchImpl, url, source.accept, source.timeoutMs);
    const items = parseSource(source, body);
    return { status: { id: source.id, name: source.name, url, ok: true, count: items.length, error: null }, items, warning: null };
  } catch (error) {
    const message = error instanceof FeedError ? error.message : "The source could not be reached.";
    return {
      status: { id: source.id, name: source.name, url, ok: false, count: 0, error: message },
      items: [],
      warning: `${source.name}: ${message}`,
    };
  }
}

function parseSource(source: SourceDef, body: string): ThreatIncident[] {
  if (source.kind === "rss") {
    if (!/<rss[\s>]/i.test(body) && !/<feed[\s>]/i.test(body)) throw new FeedError(`${source.name} did not return a feed.`);
    return incidentsFromRss(rssEntries(body, source.limit ?? 20), source.name, source.idPrefix ?? source.id);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new FeedError(`${source.name} did not return JSON.`);
  }
  if (source.kind === "kev") {
    if (!payload || typeof payload !== "object" || !Array.isArray((payload as { vulnerabilities?: unknown }).vulnerabilities)) {
      throw new FeedError("CISA KEV did not include a vulnerability list.");
    }
    return incidentsFromKev(payload, source.limit ?? 50);
  }
  if (source.kind === "ghsa") {
    if (!Array.isArray(payload)) throw new FeedError("GitHub Security Advisories did not return a list.");
    return incidentsFromGhsa(payload, source.limit ?? 20);
  }
  if (source.kind === "euvd") {
    if (!Array.isArray(payload)) throw new FeedError("ENISA did not return a list.");
    return incidentsFromEuvd(payload);
  }
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { vulnerabilities?: unknown }).vulnerabilities)) {
    throw new FeedError("NVD did not include a vulnerability list.");
  }
  return incidentsFromNvd(payload, source.limit ?? 10);
}

async function fetchText(fetchImpl: typeof fetch, url: string, accept: string, timeoutMs: number): Promise<string> {
  try {
    assertOutboundUrl(url);
  } catch (error) {
    throw new FeedError(error instanceof OutboundError ? error.message : "The outbound URL was rejected.");
  }
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { accept, "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
  } catch {
    throw new FeedError("The source could not be reached.");
  }
  if (response.url) {
    try {
      assertOutboundUrl(response.url);
    } catch {
      throw new FeedError("The source redirected away from the allowlisted host.");
    }
  }
  if (!response.ok) throw new FeedError(`The source returned HTTP ${response.status}.`);
  return readBody(response);
}

async function readBody(response: Response): Promise<string> {
  const text = await response.text();
  if (text.length > 8_000_000) throw new FeedError("The source response was too large.");
  return text;
}
