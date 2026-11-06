import { ExposureError, type PublicBreach } from "@/lib/exposure/email";
import { assertOutboundUrl } from "@/lib/security/outbound";
import { EXPOSURE_DISCLAIMER, httpsUrl } from "@/lib/exposure/privacy";
import type { Finding } from "@/lib/types";

const HOST = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost", ".localdomain"];
const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google.com",
  "metadata.amazonaws.com",
]);

export function passiveScanPermitted(scan: boolean, attested: boolean): boolean {
  return !scan || attested;
}

export function normalizeDomain(value: string): string | null {
  const host = value.trim().toLowerCase().replace(/\.$/, "");
  if (!HOST.test(host)) return null;
  if (host.includes("..") || BLOCKED_HOSTS.has(host)) return null;
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return null;
  return host;
}

export function breachesFromCatalog(payload: unknown): PublicBreach[] {
  if (!payload || typeof payload !== "object") return [];
  const rows = (payload as { exposedBreaches?: unknown }).exposedBreaches;
  if (!Array.isArray(rows)) return [];
  const breaches: PublicBreach[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const name = typeof item.breachID === "string" ? item.breachID.trim() : "";
    if (!name || name.length > 120) continue;
    const classes = Array.isArray(item.exposedData)
      ? item.exposedData.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0 && entry.length <= 80).slice(0, 16)
      : [];
    breaches.push({
      name,
      date: typeof item.breachedDate === "string" ? item.breachedDate.slice(0, 10) : null,
      domain: typeof item.domain === "string" ? item.domain.trim().slice(0, 253) : null,
      dataClasses: classes,
      passwordStorage: null,
      records: typeof item.exposedRecords === "number" && item.exposedRecords >= 0 ? Math.round(item.exposedRecords) : null,
      source: "XposedOrNot",
      sourceUrl: httpsUrl(item.referenceURL),
    });
  }
  return breaches.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export interface ScanHint {
  id: string;
  severity: Finding["severity"];
  title: string;
  evidence: string;
}

export function scanHints(findings: Finding[]): ScanHint[] {
  const rank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return [...findings]
    .filter((finding) => finding.severity === "critical" || finding.severity === "high" || finding.severity === "medium")
    .sort((a, b) => rank[a.severity] - rank[b.severity])
    .slice(0, 12)
    .map((finding) => ({
      id: finding.id,
      severity: finding.severity,
      title: finding.title,
      evidence: finding.evidence.replace(/\s+/g, " ").slice(0, 240),
    }));
}

export async function lookupDomainCatalog(domain: string, fetchImpl: typeof fetch = fetch): Promise<PublicBreach[]> {
  let response: Response;
  try {
    const url = new URL("https://api.xposedornot.com/v1/breaches");
    url.searchParams.set("domain", domain);
    assertOutboundUrl(url.toString());
    response = await fetchImpl(url, {
      headers: { accept: "application/json", "user-agent": "Bastion/0.1 (defensive exposure check)" },
      signal: AbortSignal.timeout(12_000),
      redirect: "error",
    });
  } catch {
    throw new ExposureError("The breach catalog could not be reached.");
  }
  if (response.status === 429) throw new ExposureError("The breach catalog is busy. Try again later.");
  if (!response.ok) throw new ExposureError("The breach catalog rejected the domain lookup.");
  try {
    return breachesFromCatalog(await response.json());
  } catch (error) {
    if (error instanceof ExposureError) throw error;
    throw new ExposureError("The breach catalog returned an unreadable response.");
  }
}

export { EXPOSURE_DISCLAIMER };
