import { KNOWN_AGENTS, type AgentCategory, type KnownAgent } from "./catalog";

export type TrafficCategory = AgentCategory | "automation" | "likely-browser" | "unknown";

export interface Classification {
  agent: string | null;
  vendor: string | null;
  category: TrafficCategory;
  confidence: "high" | "medium" | "low";
  matches: KnownAgent[];
}

function tokenPresent(ua: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(ua);
}

export function classifyUserAgent(userAgent: string): Classification {
  const ua = userAgent ?? "";
  const matches = KNOWN_AGENTS.filter((agent) => tokenPresent(ua, agent.token)).sort(
    (a, b) => b.token.length - a.token.length,
  );
  const unique: KnownAgent[] = [];
  for (const match of matches) {
    if (unique.some((existing) => match.token.includes(existing.token) && match.vendor === existing.vendor)) {
      continue;
    }
    if (unique.some((existing) => existing.token.includes(match.token) && existing.vendor === match.vendor)) {
      continue;
    }
    unique.push(match);
  }
  if (unique.length) {
    const primary = unique[0];
    return {
      agent: primary.id,
      vendor: primary.vendor,
      category: primary.category,
      confidence: "high",
      matches: unique,
    };
  }
  if (!ua.trim()) {
    return { agent: null, vendor: null, category: "unknown", confidence: "high", matches: [] };
  }
  if (/bot|crawler|spider|scrapy|curl\/|wget\/|python-requests|httpx|go-http-client|headless/i.test(ua)) {
    return { agent: null, vendor: null, category: "automation", confidence: "medium", matches: [] };
  }
  if (/mozilla\/5\.0/i.test(ua)) {
    return { agent: null, vendor: null, category: "likely-browser", confidence: "low", matches: [] };
  }
  return { agent: null, vendor: null, category: "unknown", confidence: "low", matches: [] };
}
