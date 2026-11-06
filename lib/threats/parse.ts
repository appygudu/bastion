import { httpsUrl } from "@/lib/exposure/privacy";
import {
  finalizeIncident,
  higherSeverity,
  isAiText,
  linkLabel,
  namedSeverity,
  plainText,
  sectorsFromText,
  severityFromScore,
  toIsoDate,
  unique,
  type ThreatIncident,
  type ThreatLink,
  type ThreatNote,
  type ThreatSeverity,
} from "@/lib/threats/model";

function linksFrom(urls: unknown[], own?: string): ThreatLink[] {
  const values = urls.map((url) => httpsUrl(url));
  if (own) values.unshift(httpsUrl(own));
  const seen = new Set<string>();
  const links: ThreatLink[] = [];
  for (const url of values) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    links.push({ label: linkLabel(url), url });
  }
  return links;
}

function baseIncident(input: {
  id: string;
  title: string;
  date: string;
  summary: string;
  products: string[];
  versions: string[];
  severity: ThreatSeverity;
  exploited: boolean;
  exploitation: string;
  links: ThreatLink[];
  note: ThreatNote;
  authorityText: string | null;
}): ThreatIncident | null {
  if (!input.title || !input.date || input.links.length === 0) return null;
  const blob = `${input.title} ${input.summary} ${input.products.join(" ")}`;
  const authority = input.authorityText ? [{ source: input.note.source, text: input.authorityText }] : [];
  return finalizeIncident({
    id: input.id,
    title: input.title.slice(0, 240),
    date: input.date,
    summary: input.summary,
    products: unique(input.products).slice(0, 12),
    versions: unique(input.versions).slice(0, 12),
    sectors: sectorsFromText(blob),
    regions: [],
    severity: input.severity,
    exploited: input.exploited,
    exploitation: input.exploitation,
    aiRelated: isAiText(blob),
    links: input.links,
    notes: [input.note],
    authority,
  });
}

export function incidentsFromKev(payload: unknown, limit = 50): ThreatIncident[] {
  if (!payload || typeof payload !== "object") return [];
  const rows = (payload as { vulnerabilities?: unknown }).vulnerabilities;
  if (!Array.isArray(rows)) return [];
  const items: ThreatIncident[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const cve = typeof item.cveID === "string" ? item.cveID.trim() : "";
    const date = typeof item.dateAdded === "string" ? toIsoDate(item.dateAdded) : null;
    const name = typeof item.vulnerabilityName === "string" ? item.vulnerabilityName.trim() : "";
    if (!/^CVE-\d{4}-\d{4,}$/.test(cve) || !date || !name) continue;
    const vendor = typeof item.vendorProject === "string" ? item.vendorProject.trim() : "";
    const product = typeof item.product === "string" ? item.product.trim() : "";
    const summary = typeof item.shortDescription === "string" ? plainText(item.shortDescription) : "";
    const ransomware = item.knownRansomwareCampaignUse === "Known";
    const action = typeof item.requiredAction === "string" ? plainText(item.requiredAction, 500) : "";
    const url = `https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=${encodeURIComponent(cve)}`;
    const notes = typeof item.notes === "string" ? item.notes : "";
    const extra = notes.match(/https:\/\/[^\s)]+/g) ?? [];
    const incident = baseIncident({
      id: cve,
      title: `${name}${vendor ? ` (${vendor}${product ? ` ${product}` : ""})` : ""}`.replace(/\s+/g, " "),
      date,
      summary: summary || "CISA did not include a short description.",
      products: [vendor, product].filter(Boolean).map((part) => part),
      versions: [],
      severity: ransomware ? "critical" : "high",
      exploited: true,
      exploitation: ransomware
        ? "Listed in the CISA Known Exploited Vulnerabilities catalog. CISA notes known ransomware use."
        : "Listed in the CISA Known Exploited Vulnerabilities catalog.",
      links: linksFrom(extra, url),
      note: { source: "CISA Known Exploited Vulnerabilities", url, date, summary: summary || "CISA did not include a short description.", action: action || null },
      authorityText: action || null,
    });
    if (incident) items.push(incident);
  }
  items.sort((a, b) => b.date.localeCompare(a.date));
  return items.slice(0, limit);
}

export interface RssEntry {
  title: string;
  link: string;
  date: string;
  summary: string;
}

export function rssEntries(xml: string, limit: number): RssEntry[] {
  if (!/<rss[\s>]/i.test(xml) && !/<feed[\s>]/i.test(xml)) return [];
  const items = xml.split(/<item\b[^>]*>/i).slice(1);
  const chunks = (items.length ? items : xml.split(/<entry\b[^>]*>/i).slice(1)).slice(0, limit + 80);
  const entries: RssEntry[] = [];
  for (const chunk of chunks) {
    const title = plainText(tag(chunk, "title"), 240);
    const link = httpsUrl(plainText(tag(chunk, "link"), 800)) ?? atomLink(chunk);
    const date = toIsoDate(plainText(tag(chunk, "pubDate") || tag(chunk, "updated") || tag(chunk, "published"), 80));
    const summary = plainText(tag(chunk, "description") || tag(chunk, "summary") || tag(chunk, "content"));
    if (!title || !link || !date) continue;
    entries.push({ title, link, date, summary: summary || "The feed did not include a description." });
    if (entries.length >= limit) break;
  }
  return entries;
}

function atomLink(block: string): string | null {
  const match = /<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i.exec(block);
  return httpsUrl(match?.[1] ?? null);
}

function tag(block: string, name: string): string {
  const cdata = new RegExp(`<${name}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${name}>`, "i").exec(block);
  if (cdata) return cdata[1];
  const plain = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return plain?.[1] ?? "";
}

export function incidentsFromRss(entries: RssEntry[], source: string, idPrefix: string): ThreatIncident[] {
  const items: ThreatIncident[] = [];
  for (const entry of entries) {
    const cves = entry.summary.match(/CVE-\d{4}-\d{4,}/g) ?? entry.title.match(/CVE-\d{4}-\d{4,}/g) ?? [];
    const id = cves.length === 1 ? cves[0] : `${idPrefix}-${slug(entry.link)}`;
    const incident = baseIncident({
      id,
      title: entry.title,
      date: entry.date,
      summary: entry.summary,
      products: [],
      versions: [],
      severity: "unknown",
      exploited: false,
      exploitation: "Not marked as exploited in the wild by this source.",
      links: linksFrom(entry.summary.match(/https:\/\/[^\s)<"]+/g) ?? [], entry.link),
      note: { source, url: entry.link, date: entry.date, summary: entry.summary, action: null },
      authorityText: null,
    });
    if (incident) items.push(incident);
  }
  return items;
}

function patchedVersion(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && typeof (value as { identifier?: unknown }).identifier === "string") {
    const identifier = (value as { identifier: string }).identifier.trim();
    return identifier || null;
  }
  return null;
}

function slug(url: string): string {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "item";
    const clean = last.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
    return clean || "item";
  } catch {
    return "item";
  }
}

export function incidentsFromGhsa(payload: unknown, limit = 20): ThreatIncident[] {
  if (!Array.isArray(payload)) return [];
  const items: ThreatIncident[] = [];
  for (const row of payload) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    if (item.withdrawn_at) continue;
    const ghsa = typeof item.ghsa_id === "string" ? item.ghsa_id.trim() : "";
    const date = typeof item.published_at === "string" ? toIsoDate(item.published_at) : null;
    const summary = typeof item.summary === "string" ? plainText(item.summary, 400) : "";
    const url = httpsUrl(item.html_url);
    if (!ghsa || !date || !url) continue;
    const description = typeof item.description === "string" ? plainText(item.description) : summary;
    const cve = typeof item.cve_id === "string" && /^CVE-\d{4}-\d{4,}$/.test(item.cve_id) ? item.cve_id : null;
    const products: string[] = [];
    const versions: string[] = [];
    if (Array.isArray(item.vulnerabilities)) {
      for (const vuln of item.vulnerabilities) {
        if (!vuln || typeof vuln !== "object") continue;
        const record = vuln as Record<string, unknown>;
        const pkg = record.package && typeof record.package === "object" ? record.package as Record<string, unknown> : null;
        const name = pkg && typeof pkg.name === "string" ? pkg.name : "";
        const ecosystem = pkg && typeof pkg.ecosystem === "string" ? pkg.ecosystem : "";
        if (name) products.push(ecosystem ? `${ecosystem}:${name}` : name);
        if (typeof record.vulnerable_version_range === "string") versions.push(record.vulnerable_version_range);
        const patched = patchedVersion(record.first_patched_version);
        if (patched) versions.push(`patched ${patched}`);
      }
    }
    const refs = Array.isArray(item.references) ? item.references : [];
    const incident = baseIncident({
      id: cve ?? ghsa,
      title: summary || ghsa,
      date,
      summary: description || summary || "GitHub did not include a description.",
      products,
      versions,
      severity: item.severity === "moderate" ? "medium" : namedSeverity(item.severity) ?? "unknown",
      exploited: false,
      exploitation: "Not marked as exploited in the wild by this source.",
      links: linksFrom(refs, url),
      note: { source: "GitHub Security Advisories", url, date, summary: description || summary || "GitHub did not include a description.", action: null },
      authorityText: null,
    });
    if (incident) items.push(incident);
    if (items.length >= limit) break;
  }
  return items;
}

export function incidentsFromEuvd(payload: unknown): ThreatIncident[] {
  if (!Array.isArray(payload)) return [];
  const items: ThreatIncident[] = [];
  for (const row of payload) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const date = typeof item.datePublished === "string" ? toIsoDate(item.datePublished) : null;
    const summary = typeof item.description === "string" ? plainText(item.description) : "";
    if (!id || !date || !summary) continue;
    const products: string[] = [];
    if (Array.isArray(item.enisaIdVendor)) {
      for (const vendor of item.enisaIdVendor) {
        if (!vendor || typeof vendor !== "object") continue;
        const name = (vendor as { vendor?: { name?: unknown } }).vendor?.name;
        if (typeof name === "string" && name.trim()) products.push(name.trim());
      }
    }
    const references = typeof item.references === "string" ? item.references.split(/\s+/) : [];
    const score = typeof item.baseScore === "number" ? item.baseScore : Number.NaN;
    const version = typeof item.baseScoreVersion === "string" ? item.baseScoreVersion : "";
    const scoreNote = Number.isFinite(score) ? ` ENISA base score ${score}${version ? ` (CVSS ${version})` : ""}.` : "";
    const url = references.map((reference) => httpsUrl(reference)).find((reference) => reference) ?? `https://euvd.enisa.europa.eu/vulnerability/${encodeURIComponent(id)}`;
    const incident = baseIncident({
      id,
      title: summary.slice(0, 180),
      date,
      summary: `${summary}${scoreNote}`,
      products,
      versions: [],
      severity: severityFromScore(score),
      exploited: false,
      exploitation: "Not marked as exploited in the wild by this source.",
      links: linksFrom(references, url),
      note: { source: "ENISA European Vulnerability Database", url, date, summary: `${summary}${scoreNote}`, action: null },
      authorityText: null,
    });
    if (incident) items.push(incident);
  }
  return items;
}

export function incidentsFromNvd(payload: unknown, limit = 10): ThreatIncident[] {
  if (!payload || typeof payload !== "object") return [];
  const rows = (payload as { vulnerabilities?: unknown }).vulnerabilities;
  if (!Array.isArray(rows)) return [];
  const items: ThreatIncident[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const cve = (row as { cve?: unknown }).cve;
    if (!cve || typeof cve !== "object") continue;
    const item = cve as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const date = typeof item.published === "string" ? toIsoDate(item.published) : null;
    if (!/^CVE-\d{4}-\d{4,}$/.test(id) || !date) continue;
    const descriptions = Array.isArray(item.descriptions) ? item.descriptions : [];
    const english = descriptions.find((entry) => entry && typeof entry === "object" && (entry as { lang?: string }).lang === "en") as { value?: unknown } | undefined;
    const summary = typeof english?.value === "string" ? plainText(english.value) : "";
    const metrics = item.metrics && typeof item.metrics === "object" ? item.metrics as Record<string, unknown> : {};
    const metricList = [metrics.cvssMetricV31, metrics.cvssMetricV30, metrics.cvssMetricV40].find(Array.isArray) as Record<string, unknown>[] | undefined;
    const cvss = metricList?.[0]?.cvssData && typeof metricList[0].cvssData === "object" ? metricList[0].cvssData as Record<string, unknown> : null;
    const severity = namedSeverity(cvss?.baseSeverity) ?? severityFromScore(typeof cvss?.baseScore === "number" ? cvss.baseScore : Number.NaN);
    const exploited = typeof item.cisaExploitAdd === "string" && item.cisaExploitAdd.length > 0;
    const action = typeof item.cisaRequiredAction === "string" ? plainText(item.cisaRequiredAction, 500) : "";
    const products: string[] = [];
    const versions: string[] = [];
    collectCpe(item.configurations, products, versions);
    const references = Array.isArray(item.references) ? item.references.flatMap((reference) => (reference && typeof reference === "object" ? [(reference as { url?: unknown }).url] : [])) : [];
    const url = `https://nvd.nist.gov/vuln/detail/${id}`;
    const incident = baseIncident({
      id,
      title: typeof item.cisaVulnerabilityName === "string" && item.cisaVulnerabilityName.trim() ? item.cisaVulnerabilityName.trim() : id,
      date,
      summary: summary || "NVD did not include an English description.",
      products,
      versions,
      severity: exploited ? higherSeverity(severity, "high") : severity,
      exploited,
      exploitation: exploited ? "NVD includes a CISA exploit-add date for this CVE." : "Not marked as exploited in the wild by this source.",
      links: linksFrom(references, url),
      note: { source: "NVD", url, date, summary: summary || "NVD did not include an English description.", action: action || null },
      authorityText: action || null,
    });
    if (incident) items.push(incident);
    if (items.length >= limit) break;
  }
  return items;
}

function collectCpe(configurations: unknown, products: string[], versions: string[]) {
  if (!Array.isArray(configurations)) return;
  const stack = [...configurations];
  while (stack.length && products.length < 8) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    const record = node as Record<string, unknown>;
    if (Array.isArray(record.nodes)) stack.push(...record.nodes);
    const matches = record.cpeMatch;
    if (!Array.isArray(matches)) continue;
    for (const match of matches) {
      if (!match || typeof match !== "object") continue;
      const row = match as Record<string, unknown>;
      const criteria = typeof row.criteria === "string" ? row.criteria : "";
      const parts = criteria.split(":");
      if (parts.length > 4 && parts[0] === "cpe") {
        const vendor = parts[3]?.replace(/\\/g, "") ?? "";
        const product = parts[4]?.replace(/\\/g, "") ?? "";
        if (product && product !== "*") products.push(vendor && vendor !== "*" ? `${vendor} ${product}` : product);
      }
      if (typeof row.versionStartIncluding === "string") versions.push(`from ${row.versionStartIncluding}`);
      if (typeof row.versionEndExcluding === "string") versions.push(`before ${row.versionEndExcluding}`);
      if (typeof row.versionEndIncluding === "string") versions.push(`through ${row.versionEndIncluding}`);
    }
  }
}

export function mergeIncidents(groups: ThreatIncident[][]): ThreatIncident[] {
  const byId = new Map<string, ThreatIncident>();
  for (const incident of groups.flat()) {
    const existing = byId.get(incident.id);
    if (!existing) {
      byId.set(incident.id, incident);
      continue;
    }
    const notes = [...existing.notes];
    for (const note of incident.notes) {
      if (!notes.some((item) => item.url === note.url)) notes.push(note);
    }
    const links = [...existing.links];
    for (const link of incident.links) {
      if (!links.some((item) => item.url === link.url)) links.push(link);
    }
    const authority = [...existing.authority];
    for (const action of incident.authority) {
      if (!authority.some((item) => item.text === action.text)) authority.push(action);
    }
    const exploited = existing.exploited || incident.exploited;
    const merged = finalizeIncident({
      id: existing.id,
      title: existing.exploited ? existing.title : incident.exploited ? incident.title : existing.title,
      date: existing.date < incident.date ? existing.date : incident.date,
      summary: existing.summary.length >= incident.summary.length ? existing.summary : incident.summary,
      products: unique([...existing.products, ...incident.products]).slice(0, 12),
      versions: unique([...existing.versions, ...incident.versions]).slice(0, 12),
      sectors: unique([...existing.sectors, ...incident.sectors]),
      regions: [],
      severity: higherSeverity(existing.severity, incident.severity),
      exploited,
      exploitation: exploited
        ? [existing, incident].find((item) => item.exploited)?.exploitation ?? existing.exploitation
        : existing.exploitation,
      aiRelated: existing.aiRelated || incident.aiRelated,
      links,
      notes,
      authority,
    });
    byId.set(incident.id, merged);
  }
  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}
