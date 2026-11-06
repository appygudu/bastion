import { forgetSnapshot, readSnapshot, writeSnapshot } from "@/lib/cache/snapshot";
import { ExposureError } from "@/lib/exposure/email";
import { httpsUrl } from "@/lib/exposure/privacy";
import { assertOutboundUrl } from "@/lib/security/outbound";

export type AdvisorySeverity = "critical" | "high" | "medium" | "low" | "unknown";

export interface Advisory {
  id: string;
  title: string;
  date: string;
  source: string;
  sourceUrl: string;
  summary: string;
  severity: AdvisorySeverity;
  aiRelated: boolean;
  action: string | null;
}

export interface AdvisoryFeed {
  items: Advisory[];
  updatedAt: string | null;
  catalogReleased: string | null;
  stale: boolean;
  warnings: string[];
  error: string | null;
}

const AI_PATTERN =
  /\b(artificial intelligence|generative ai|large language model|llm|openai|chatgpt|anthropic|claude|langchain|langgraph|llamaindex|llama-index|hugging face|huggingface|transformers|ollama|vllm|model context protocol|mcp server|ai agent|autonomous agent)\b/i;

export const WATCHED_PACKAGES: { ecosystem: "npm" | "PyPI"; name: string }[] = [
  { ecosystem: "npm", name: "langchain" },
  { ecosystem: "npm", name: "@langchain/core" },
  { ecosystem: "npm", name: "openai" },
  { ecosystem: "npm", name: "@anthropic-ai/sdk" },
  { ecosystem: "npm", name: "@modelcontextprotocol/sdk" },
  { ecosystem: "PyPI", name: "langchain" },
  { ecosystem: "PyPI", name: "openai" },
  { ecosystem: "PyPI", name: "anthropic" },
  { ecosystem: "PyPI", name: "transformers" },
  { ecosystem: "PyPI", name: "llama-index" },
  { ecosystem: "PyPI", name: "mcp" },
];

const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const TTL_MS = 60 * 60 * 1000;

let cache: { at: number; feed: AdvisoryFeed } | null = null;

export function resetAdvisoryCache() {
  cache = null;
  forgetSnapshot("advisories");
}

export function isAiRelated(text: string): boolean {
  return AI_PATTERN.test(text);
}

function namedSeverity(value: unknown): AdvisorySeverity | null {
  if (typeof value !== "string") return null;
  const label = value.trim().toLowerCase();
  if (label === "critical" || label === "high" || label === "medium" || label === "low") return label;
  return null;
}

export function advisoriesFromKev(payload: unknown): { items: Advisory[]; catalogReleased: string | null } {
  if (!payload || typeof payload !== "object") return { items: [], catalogReleased: null };
  const body = payload as { dateReleased?: unknown; vulnerabilities?: unknown };
  const catalogReleased = typeof body.dateReleased === "string" ? body.dateReleased : null;
  if (!Array.isArray(body.vulnerabilities)) return { items: [], catalogReleased };
  const items: Advisory[] = [];
  for (const row of body.vulnerabilities) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const id = typeof item.cveID === "string" ? item.cveID.trim() : "";
    const date = typeof item.dateAdded === "string" ? item.dateAdded.trim() : "";
    const name = typeof item.vulnerabilityName === "string" ? item.vulnerabilityName.trim() : "";
    if (!/^CVE-\d{4}-\d{4,}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !name) continue;
    const vendor = typeof item.vendorProject === "string" ? item.vendorProject : "";
    const product = typeof item.product === "string" ? item.product : "";
    const summary = typeof item.shortDescription === "string" ? item.shortDescription.trim() : "";
    const ransomware = item.knownRansomwareCampaignUse === "Known";
    const text = `${vendor} ${product} ${name} ${summary}`;
    items.push({
      id,
      title: `${name} (${vendor}${product ? ` ${product}` : ""})`.replace(/\s+/g, " ").trim(),
      date,
      source: "CISA Known Exploited Vulnerabilities",
      sourceUrl: `https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=${encodeURIComponent(id)}`,
      summary: summary.slice(0, 500),
      severity: ransomware ? "critical" : "high",
      aiRelated: isAiRelated(text),
      action: typeof item.requiredAction === "string" ? item.requiredAction.trim().slice(0, 400) : null,
    });
  }
  items.sort((a, b) => b.date.localeCompare(a.date));
  const recent = items.slice(0, 40);
  const extraAi = items.filter((item) => item.aiRelated && !recent.some((kept) => kept.id === item.id)).slice(0, 15);
  return { items: [...recent, ...extraAi], catalogReleased };
}

function osvSeverity(row: Record<string, unknown>): AdvisorySeverity {
  const specific = row.database_specific;
  if (specific && typeof specific === "object") {
    const named = namedSeverity((specific as { severity?: unknown }).severity);
    if (named) return named;
  }
  const scores = Array.isArray(row.severity) ? row.severity : [];
  for (const score of scores) {
    if (!score || typeof score !== "object") continue;
    const named = namedSeverity((score as { score?: unknown }).score);
    if (named) return named;
  }
  return "unknown";
}

function osvSummary(row: Record<string, unknown>): string {
  if (typeof row.summary === "string" && row.summary.trim()) return row.summary.trim().slice(0, 500);
  return "";
}

export function advisoriesFromOsv(payload: unknown, watched: { ecosystem: string; name: string }): Advisory[] {
  if (!payload || typeof payload !== "object") return [];
  const vulns = (payload as { vulns?: unknown }).vulns;
  if (!Array.isArray(vulns)) return [];
  const items: Advisory[] = [];
  for (const row of vulns) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const published = typeof item.published === "string" ? item.published.slice(0, 10) : "";
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(published)) continue;
    const references = Array.isArray(item.references) ? item.references : [];
    const refUrl = references.map((reference) => (reference && typeof reference === "object" ? httpsUrl((reference as { url?: unknown }).url) : null)).find((url) => url);
    const sourceUrl = refUrl ?? (id.startsWith("GHSA-") ? `https://github.com/advisories/${id}` : `https://osv.dev/vulnerability/${encodeURIComponent(id)}`);
    const summary = osvSummary(item);
    items.push({
      id,
      title: summary || id,
      date: published,
      source: id.startsWith("GHSA-") ? "OSV.dev / GitHub Advisory Database" : "OSV.dev",
      sourceUrl,
      summary: summary || "OSV did not include a summary. The linked record is the source.",
      severity: osvSeverity(item),
      aiRelated: isAiRelated(`${watched.name} ${watched.ecosystem} ${summary} ${id}`),
      action: null,
    });
  }
  items.sort((a, b) => b.date.localeCompare(a.date));
  return items.slice(0, 5).map((item) => ({ ...item, title: `${watched.name} (${watched.ecosystem}): ${item.title}`.slice(0, 220) }));
}

async function fetchJson(fetchImpl: typeof fetch, url: string, init?: RequestInit): Promise<unknown> {
  assertOutboundUrl(url);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      ...init,
      headers: { accept: "application/json", "user-agent": "Bastion/0.1 (defensive exposure check)", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(12_000),
      redirect: "error",
    });
  } catch {
    throw new ExposureError("A source could not be reached.");
  }
  if (!response.ok) throw new ExposureError("A source returned an error.");
  try {
    return await response.json();
  } catch {
    throw new ExposureError("A source returned an unreadable response.");
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function loadOsv(fetchImpl: typeof fetch): Promise<Advisory[]> {
  let failures = 0;
  const batches = await mapPool(WATCHED_PACKAGES, 4, async (pkg) => {
    try {
      const payload = await fetchJson(fetchImpl, "https://api.osv.dev/v1/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ package: { name: pkg.name, ecosystem: pkg.ecosystem } }),
      });
      return advisoriesFromOsv(payload, pkg).map((item) => ({ ...item, aiRelated: true }));
    } catch {
      failures += 1;
      return [];
    }
  });
  if (failures === WATCHED_PACKAGES.length) throw new ExposureError("OSV advisories could not be refreshed.");
  const seen = new Set<string>();
  const items: Advisory[] = [];
  for (const advisory of batches.flat().sort((a, b) => b.date.localeCompare(a.date))) {
    if (seen.has(advisory.id)) continue;
    seen.add(advisory.id);
    items.push(advisory);
    if (items.length >= 30) break;
  }
  return items;
}

function reviveAdvisory(value: unknown): AdvisoryFeed | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as AdvisoryFeed).items)) return null;
  return value as AdvisoryFeed;
}

export async function loadAdvisories(fetchImpl: typeof fetch = fetch, now = Date.now()): Promise<AdvisoryFeed> {
  if (cache && now - cache.at < TTL_MS) return cache.feed;
  const stored = await readSnapshot("advisories", reviveAdvisory);
  if (stored && now - stored.fetchedAt < TTL_MS) {
    cache = { at: stored.fetchedAt, feed: stored.value };
    return stored.value;
  }
  const warnings: string[] = [];
  let kevItems: Advisory[] = [];
  let catalogReleased: string | null = null;
  let osvItems: Advisory[] = [];
  try {
    const payload = await fetchJson(fetchImpl, KEV_URL);
    const parsed = advisoriesFromKev(payload);
    kevItems = parsed.items;
    catalogReleased = parsed.catalogReleased;
  } catch {
    warnings.push("CISA Known Exploited Vulnerabilities could not be refreshed.");
  }
  try {
    osvItems = await loadOsv(fetchImpl);
  } catch {
    warnings.push("OSV advisories for the AI and agent package list could not be refreshed.");
  }
  if (kevItems.length === 0 && osvItems.length === 0) {
    const previous = stored?.value ?? cache?.feed ?? null;
    if (previous) return { ...previous, stale: true, warnings: [...previous.warnings, ...warnings] };
    return {
      items: [],
      updatedAt: null,
      catalogReleased: null,
      stale: false,
      warnings,
      error: "Advisories could not be loaded from CISA or OSV.",
    };
  }
  const feed: AdvisoryFeed = {
    items: [...kevItems, ...osvItems],
    updatedAt: new Date(now).toISOString(),
    catalogReleased,
    stale: false,
    warnings,
    error: null,
  };
  cache = { at: now, feed };
  await writeSnapshot("advisories", feed, now);
  return feed;
}

const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]{0,200}$/i;

export function normalizePackage(ecosystem: string, name: string): { ecosystem: "npm" | "PyPI"; name: string } | null {
  if (ecosystem !== "npm" && ecosystem !== "PyPI") return null;
  const trimmed = name.trim();
  if (!PACKAGE_NAME.test(trimmed) || trimmed.includes("..")) return null;
  return { ecosystem, name: trimmed };
}

export async function lookupPackage(
  pkg: { ecosystem: "npm" | "PyPI"; name: string },
  fetchImpl: typeof fetch = fetch,
): Promise<Advisory[]> {
  let response: Response;
  try {
    assertOutboundUrl("https://api.osv.dev/v1/query");
    response = await fetchImpl("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "user-agent": "Bastion/0.1 (defensive exposure check)",
      },
      body: JSON.stringify({ package: { name: pkg.name, ecosystem: pkg.ecosystem } }),
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
  } catch {
    throw new ExposureError("OSV.dev could not be reached.");
  }
  if (!response.ok) throw new ExposureError("OSV.dev rejected the package lookup.");
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ExposureError("OSV.dev returned an unreadable response.");
  }
  return advisoriesFromOsv(payload, pkg).map((item) => ({
    ...item,
    aiRelated: isAiRelated(`${pkg.name} ${item.title} ${item.summary}`) || WATCHED_PACKAGES.some((watched) => watched.ecosystem === pkg.ecosystem && watched.name === pkg.name),
  }));
}
