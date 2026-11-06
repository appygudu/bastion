export type GuardrailDecision = "allow" | "flag" | "deny";

export interface GuardrailRules {
  tools: Record<string, GuardrailDecision>;
  domains: Record<string, GuardrailDecision>;
  onInjection: "flag" | "deny";
  onRiskyTool: "flag" | "deny";
}

export const DEFAULT_RULES: GuardrailRules = {
  tools: {},
  domains: {},
  onInjection: "flag",
  onRiskyTool: "flag",
};

const DECISIONS = new Set<GuardrailDecision>(["allow", "flag", "deny"]);

export function parseGuardrailRules(raw: unknown): GuardrailRules | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const tools = readMap(value.tools);
  const domains = readMap(value.domains);
  if (!tools || !domains) return null;
  if (value.onInjection !== "flag" && value.onInjection !== "deny") return null;
  if (value.onRiskyTool !== "flag" && value.onRiskyTool !== "deny") return null;
  if (Object.keys(tools).length > 40 || Object.keys(domains).length > 40) return null;
  return { tools, domains, onInjection: value.onInjection, onRiskyTool: value.onRiskyTool };
}

function readMap(value: unknown): Record<string, GuardrailDecision> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, GuardrailDecision> = {};
  for (const [key, decision] of Object.entries(value)) {
    const name = key.trim().toLowerCase();
    if (!name || name.length > 253 || !DECISIONS.has(decision as GuardrailDecision)) return null;
    out[name] = decision as GuardrailDecision;
  }
  return out;
}

export function hostsInContent(content: string): string[] {
  const found = new Set<string>();
  for (const match of content.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    try {
      const host = new URL(match[0]).hostname.replace(/\.$/, "").toLowerCase();
      if (host) found.add(host);
    } catch {
      // Ignore text that only looks like a URL.
    }
  }
  return [...found];
}

export function combineDecision(input: {
  tool: string;
  content: string;
  findings: { id: string }[];
  rules: GuardrailRules;
}): GuardrailDecision {
  const toolRule = input.rules.tools[input.tool.trim().toLowerCase()];
  let domain: GuardrailDecision | undefined;
  for (const host of hostsInContent(input.content)) {
    const rule = input.rules.domains[host];
    if (rule === "deny") domain = "deny";
    else if (rule === "flag" && domain !== "deny") domain = "flag";
    else if (rule === "allow" && !domain) domain = "allow";
  }
  const injection = input.findings.some((finding) => finding.id.startsWith("llm-"));
  const risky = input.findings.some((finding) => finding.id === "excessive-agency");
  if (toolRule === "deny" || domain === "deny") return "deny";
  if (injection && input.rules.onInjection === "deny") return "deny";
  if (risky && input.rules.onRiskyTool === "deny") return "deny";
  if (toolRule === "flag" || domain === "flag" || input.findings.length > 0) return "flag";
  return "allow";
}

export function rulesFromLists(input: {
  tools: { name: string; decision: GuardrailDecision }[];
  domains: { host: string; decision: GuardrailDecision }[];
  onInjection: "flag" | "deny";
  onRiskyTool: "flag" | "deny";
}): GuardrailRules | null {
  const tools: Record<string, GuardrailDecision> = {};
  const domains: Record<string, GuardrailDecision> = {};
  for (const tool of input.tools) {
    const name = tool.name.trim().toLowerCase();
    if (!/^[a-z0-9_.:-]{1,80}$/.test(name)) return null;
    tools[name] = tool.decision;
  }
  for (const domain of input.domains) {
    const host = domain.host.trim().toLowerCase().replace(/\.$/, "");
    if (!/^[a-z0-9.-]{1,253}$/.test(host) || host.includes("..") || host.startsWith(".") || host.endsWith(".")) return null;
    domains[host] = domain.decision;
  }
  return parseGuardrailRules({ tools, domains, onInjection: input.onInjection, onRiskyTool: input.onRiskyTool });
}
