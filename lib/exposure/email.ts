import { EXPOSURE_DISCLAIMER, httpsUrl, redactText } from "@/lib/exposure/privacy";
import { assertOutboundUrl } from "@/lib/security/outbound";

export class ExposureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExposureError";
  }
}

export interface PublicBreach {
  name: string;
  date: string | null;
  domain: string | null;
  dataClasses: string[];
  passwordStorage: string | null;
  records: number | null;
  source: string;
  sourceUrl: string | null;
}

export interface EmailLookup {
  breaches: PublicBreach[];
  total: number;
  truncated: boolean;
  sources: string[];
  warnings: string[];
  disclaimer: string;
}

const CAP = 40;
const XON_ANALYTICS = "https://api.xposedornot.com/v1/breach-analytics";
const HIBP_BREACH = "https://haveibeenpwned.com/api/v3/breachedaccount/";

const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (email.includes("..") || !EMAIL.test(email)) return null;
  return email;
}

function classesFrom(value: unknown): string[] {
  const parts = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[;,]/)
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    if (typeof part !== "string") continue;
    const label = redactText(part).trim();
    if (!label || label.length > 80 || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push(label);
    if (out.length >= 16) break;
  }
  return out;
}

function passwordStorage(value: unknown): string | null {
  const label = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (label === "plaintext" || label === "plain" || label === "easytocrack") return "Weak or reversible password storage";
  if (label === "hardtocrack" || label === "stronghash") return "Hashed password storage";
  return null;
}

function yearOrDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4})(?:-(\d{2})-(\d{2}))?/);
  if (!match) return null;
  return match[2] && match[3] ? `${match[1]}-${match[2]}-${match[3]}` : match[1];
}

function records(value: unknown): number | null {
  const number = typeof value === "number" ? value : null;
  if (number == null || !Number.isFinite(number) || number < 0) return null;
  return Math.round(number);
}

export function breachesFromAnalytics(payload: unknown): PublicBreach[] {
  if (!payload || typeof payload !== "object") return [];
  const exposed = (payload as { ExposedBreaches?: { breaches_details?: unknown } | null }).ExposedBreaches;
  const details = exposed && typeof exposed === "object" ? exposed.breaches_details : null;
  if (!Array.isArray(details)) return [];
  const breaches: PublicBreach[] = [];
  for (const row of details) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const name = typeof item.breach === "string" ? item.breach.trim() : "";
    if (!name || name.length > 120) continue;
    breaches.push({
      name,
      date: yearOrDate(item.xposed_date),
      domain: typeof item.domain === "string" ? item.domain.trim().slice(0, 253) : null,
      dataClasses: classesFrom(item.xposed_data),
      passwordStorage: passwordStorage(item.password_risk),
      records: records(item.xposed_records),
      source: "XposedOrNot",
      sourceUrl: httpsUrl(item.references),
    });
  }
  return breaches;
}

export function breachesFromHibp(payload: unknown): PublicBreach[] {
  if (!Array.isArray(payload)) return [];
  const breaches: PublicBreach[] = [];
  for (const row of payload) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const name = typeof item.Title === "string" && item.Title.trim() ? item.Title.trim() : typeof item.Name === "string" ? item.Name.trim() : "";
    if (!name || name.length > 120) continue;
    breaches.push({
      name,
      date: yearOrDate(item.BreachDate),
      domain: typeof item.Domain === "string" ? item.Domain.trim().slice(0, 253) : null,
      dataClasses: classesFrom(item.DataClasses),
      passwordStorage: null,
      records: records(item.PwnCount),
      source: "Have I Been Pwned",
      sourceUrl: "https://haveibeenpwned.com/FAQs",
    });
  }
  return breaches;
}

function mergeBreaches(groups: PublicBreach[][]): PublicBreach[] {
  const byName = new Map<string, PublicBreach>();
  for (const breach of groups.flat()) {
    const key = breach.name.toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, breach);
      continue;
    }
    const dataClasses = [...existing.dataClasses];
    for (const label of breach.dataClasses) {
      if (!dataClasses.some((item) => item.toLowerCase() === label.toLowerCase())) dataClasses.push(label);
    }
    byName.set(key, {
      ...existing,
      date: existing.date && existing.date.length >= (breach.date?.length ?? 0) ? existing.date : breach.date,
      domain: existing.domain || breach.domain,
      dataClasses: dataClasses.slice(0, 16),
      passwordStorage: existing.passwordStorage ?? breach.passwordStorage,
      records: existing.records ?? breach.records,
      source: existing.source === breach.source ? existing.source : `${existing.source} and ${breach.source}`,
      sourceUrl: existing.sourceUrl ?? breach.sourceUrl,
    });
  }
  return [...byName.values()].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ExposureError("The breach catalog returned an unreadable response.");
  }
}

export async function lookupEmail(
  email: string,
  options: { hibpApiKey?: string; fetchImpl?: typeof fetch } = {},
): Promise<EmailLookup> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sources: string[] = [];
  const warnings: string[] = [];
  const groups: PublicBreach[][] = [];

  let analytics: Response;
  try {
    const url = new URL(XON_ANALYTICS);
    url.searchParams.set("email", email);
    assertOutboundUrl(url.toString());
    analytics = await fetchImpl(url, {
      headers: { accept: "application/json", "user-agent": "Bastion/0.1 (defensive exposure check)" },
      signal: AbortSignal.timeout(12_000),
      redirect: "error",
    });
  } catch {
    throw new ExposureError("The breach catalog could not be reached.");
  }
  if (analytics.status === 429) throw new ExposureError("The breach catalog is busy. Try again later.");
  if (!analytics.ok && analytics.status !== 404) throw new ExposureError("The breach catalog rejected the lookup.");
  sources.push("XposedOrNot");
  if (analytics.ok) groups.push(breachesFromAnalytics(await readJson(analytics)));

  const hibpKey = options.hibpApiKey?.trim();
  if (hibpKey) {
    try {
      const hibpUrl = `${HIBP_BREACH}${encodeURIComponent(email)}?truncateResponse=false`;
      assertOutboundUrl(hibpUrl);
      const response = await fetchImpl(hibpUrl, {
        headers: {
          "hibp-api-key": hibpKey,
          "user-agent": "Bastion-exposure-check",
          accept: "application/json",
        },
        signal: AbortSignal.timeout(12_000),
        redirect: "error",
      });
      if (response.status === 404) {
        sources.push("Have I Been Pwned");
      } else if (response.ok) {
        sources.push("Have I Been Pwned");
        groups.push(breachesFromHibp(await readJson(response)));
      } else {
        warnings.push("Have I Been Pwned could not be queried. XposedOrNot results are shown on their own.");
      }
    } catch {
      warnings.push("Have I Been Pwned could not be reached. XposedOrNot results are shown on their own.");
    }
  }

  const merged = mergeBreaches(groups);
  return {
    breaches: merged.slice(0, CAP),
    total: merged.length,
    truncated: merged.length > CAP,
    sources,
    warnings,
    disclaimer: EXPOSURE_DISCLAIMER,
  };
}
