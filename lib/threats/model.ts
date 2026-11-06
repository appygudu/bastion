export type ThreatSeverity = "critical" | "high" | "medium" | "low" | "unknown";

export interface ThreatLink {
  label: string;
  url: string;
}

export interface ThreatNote {
  source: string;
  url: string;
  date: string;
  summary: string;
  action: string | null;
}

export interface ThreatPrecaution {
  audience: "organisations" | "individuals" | "ai-systems";
  text: string;
}

export interface ThreatIncident {
  id: string;
  title: string;
  date: string;
  summary: string;
  products: string[];
  versions: string[];
  sectors: string[];
  regions: string[];
  severity: ThreatSeverity;
  exploited: boolean;
  exploitation: string;
  aiRelated: boolean;
  links: ThreatLink[];
  notes: ThreatNote[];
  authority: { source: string; text: string }[];
  userAdvisory: string;
  precautions: ThreatPrecaution[];
}

export interface ThreatSourceStatus {
  id: string;
  name: string;
  url: string;
  ok: boolean;
  count: number;
  error: string | null;
}

export interface ThreatFeed {
  items: ThreatIncident[];
  updatedAt: string | null;
  stale: boolean;
  warnings: string[];
  error: string | null;
  sources: ThreatSourceStatus[];
  cap: number;
}

export interface ThreatQuery {
  q?: string;
  rangeDays?: number | null;
  severity?: ThreatSeverity | "all";
  sector?: string;
  ai?: boolean;
  exploited?: boolean;
}

const AI_PATTERN =
  /\b(artificial intelligence|generative ai|large language model|llm|openai|chatgpt|anthropic|claude|langchain|langgraph|llamaindex|llama-index|hugging face|huggingface|transformers|ollama|vllm|model context protocol|mcp server|ai agent|autonomous agent)\b/i;

const SECTOR_RULES: { name: string; pattern: RegExp }[] = [
  { name: "Healthcare", pattern: /\b(hospitals?|healthcare|medical|patients?|clinics?)\b/i },
  { name: "Energy", pattern: /\b(energy|oil and gas|power grid|electric utility|pipelines?)\b/i },
  { name: "Finance", pattern: /\b(banks?|banking|financial|payment cards?)\b/i },
  { name: "Government", pattern: /\b(governments?|ministry|federal agency|municipal)\b/i },
  { name: "Telecommunications", pattern: /\b(telecoms?|telecommunications|5g)\b/i },
  { name: "Education", pattern: /\b(universit(?:y|ies)|school districts?|education sector)\b/i },
  { name: "Industrial", pattern: /\b(industrial control|scada|operational technology)\b/i },
];

export const THREAT_SECTORS = SECTOR_RULES.map((rule) => rule.name);

const SEVERITY_RANK: Record<ThreatSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };

export function plainText(value: string, limit = 900): string {
  let decoded = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decoded
      .replace(/&#0*34;|&#x0*22;|&quot;/gi, '"')
      .replace(/&#0*39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/&nbsp;/gi, " ");
    if (next === decoded) break;
    decoded = next;
  }
  return decoded.replace(/<[^>]+>/g, " ").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}

export function decodeThreatId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export function toIsoDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2}|GMT|UTC)\s*$/i.test(trimmed);
  const parsed = Date.parse(hasZone ? trimmed : `${trimmed} UTC`);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

export function isAiText(value: string): boolean {
  return AI_PATTERN.test(value);
}

export function sectorsFromText(value: string): string[] {
  return SECTOR_RULES.filter((rule) => rule.pattern.test(value)).map((rule) => rule.name);
}

export function linkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith("cisa.gov")) return "CISA";
    if (host.endsWith("cert-in.org.in")) return "CERT-In";
    if (host.endsWith("ncsc.gov.uk")) return "NCSC UK";
    if (host.endsWith("enisa.europa.eu") || host.includes("euvd")) return "ENISA";
    if (host.endsWith("microsoft.com")) return "Microsoft";
    if (host.endsWith("cisco.com")) return "Cisco";
    if (host.endsWith("nist.gov")) return "NVD";
    if (host === "github.com" || host.endsWith("github.com")) return "GitHub Advisory";
    return host;
  } catch {
    return "Source";
  }
}

export function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    out.push(trimmed);
  }
  return out;
}

export function higherSeverity(left: ThreatSeverity, right: ThreatSeverity): ThreatSeverity {
  return SEVERITY_RANK[left] >= SEVERITY_RANK[right] ? left : right;
}

export function namedSeverity(value: unknown): ThreatSeverity | null {
  if (typeof value !== "string") return null;
  const label = value.trim().toLowerCase();
  if (label === "critical" || label === "high" || label === "medium" || label === "low") return label;
  return null;
}

export function severityFromScore(score: number): ThreatSeverity {
  if (!Number.isFinite(score) || score <= 0) return "unknown";
  if (score >= 9) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

export function buildGuidance(input: {
  title: string;
  products: string[];
  versions: string[];
  exploited: boolean;
  exploitation: string;
  aiRelated: boolean;
  authority: { source: string; text: string }[];
}): { userAdvisory: string; precautions: ThreatPrecaution[] } {
  const named = input.products.length ? input.products.join(", ") : "the products named in the source record";
  const versions = input.versions.length ? ` Versions named by the source: ${input.versions.join("; ")}.` : " The source record did not include a version range.";
  const exploited = input.exploited
    ? `${input.exploitation} Treat ${named} as already used in attacks.`
    : `${input.exploitation} Review ${named} even so.`;
  const ai = input.aiRelated
    ? " Where an AI, LLM, or agent component is named, pause unattended tool use until that component is updated."
    : "";
  const userAdvisory = `General guidance, not the authority's words. ${exploited}${versions}${ai}`;
  const precautions: ThreatPrecaution[] = [
    {
      audience: "organisations",
      text: `General guidance, not the authority's words. Inventory ${named}, apply the fix linked from the source, and search logs for the advisory identifier. If the record is marked exploited, start with internet-facing instances.`,
    },
    {
      audience: "individuals",
      text: `General guidance, not the authority's words. Install the vendor update for ${named}. Do not send a password or token to anyone who contacts you about this record.`,
    },
  ];
  if (input.aiRelated) {
    precautions.push({
      audience: "ai-systems",
      text: `General guidance, not the authority's words. Update the named AI or agent component, revoke tokens that can call it, and require a person to approve shell, file, or network tools until the linked advisory is addressed.`,
    });
  }
  return { userAdvisory, precautions };
}

export function finalizeIncident(draft: Omit<ThreatIncident, "userAdvisory" | "precautions" | "authority"> & { authority?: { source: string; text: string }[] }): ThreatIncident {
  const authority = draft.authority ?? [];
  const guidance = buildGuidance({ ...draft, authority });
  return { ...draft, authority, ...guidance, regions: [] };
}

export function filterIncidents(items: ThreatIncident[], query: ThreatQuery, today = new Date().toISOString().slice(0, 10)): ThreatIncident[] {
  const needle = query.q?.trim().toLowerCase() ?? "";
  const cutoff = query.rangeDays ? shiftDate(today, query.rangeDays) : null;
  return items.filter((item) => {
    if (cutoff && item.date < cutoff) return false;
    if (query.severity && query.severity !== "all" && item.severity !== query.severity) return false;
    if (query.sector && query.sector !== "all" && !item.sectors.includes(query.sector)) return false;
    if (query.ai && !item.aiRelated) return false;
    if (query.exploited && !item.exploited) return false;
    if (!needle) return true;
    const haystack = [item.title, item.summary, item.id, item.exploitation, ...item.products, ...item.versions, ...item.notes.map((note) => `${note.source} ${note.summary}`)].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
}

function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function incidentsToCsv(items: ThreatIncident[]): string {
  const header = ["date", "title", "severity", "exploited", "products", "versions", "sectors", "sources", "urls"];
  const lines = items.map((item) => [
    item.date,
    item.title,
    item.severity,
    item.exploited ? "yes" : "no",
    item.products.join("; "),
    item.versions.join("; "),
    item.sectors.join("; "),
    item.notes.map((note) => note.source).join("; "),
    item.links.map((link) => link.url).join(" "),
  ].map(csvCell).join(","));
  return [header.join(","), ...lines].join("\n");
}

function csvCell(value: string): string {
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}
