import { createHash } from "node:crypto";

export const GENESIS = "bastion-genesis-v1";

export function canonical(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) out[key] = sortValue(source[key]);
    return out;
  }
  return value;
}

export function chainHash(prev: string, payload: string): string {
  return createHash("sha256").update(`${prev}\n${payload}`).digest("hex");
}

export interface TrafficChainInput {
  id: string;
  occurredAt: string;
  siteId: string;
  method: string;
  path: string;
  status: number | null;
  ip: string;
  userAgent: string;
  agent: string;
  category: string;
  source: string;
  anomalyCodes: string;
}

export interface AgentChainInput {
  id: string;
  occurredAt: string;
  siteId: string;
  agentName: string;
  tool: string;
  outcome: string;
  promptHash: string;
  findingIds: string;
}

export function trafficPayload(input: TrafficChainInput): string {
  return canonical({ kind: "traffic", ...input });
}

export function agentPayload(input: AgentChainInput): string {
  return canonical({ kind: "agent", ...input });
}

export interface ChainLink {
  prevHash: string;
  hash: string;
  payload: string;
}

export function verifyChain(links: ChainLink[]): { ok: boolean; brokenAt?: number } {
  let prev = GENESIS;
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    if (link.prevHash !== prev) return { ok: false, brokenAt: i };
    if (chainHash(prev, link.payload) !== link.hash) return { ok: false, brokenAt: i };
    prev = link.hash;
  }
  return { ok: true };
}
