import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { agentPayload, chainHash, GENESIS, trafficPayload } from "@/lib/audit/hashchain";
import { detectAnomalies } from "@/lib/bots/anomalies";
import { classifyUserAgent } from "@/lib/bots/classify";
import { prisma } from "@/lib/db";
import { hashPrompt, reviewAgentCall } from "@/lib/guardrails/engine";
import { combineDecision, DEFAULT_RULES, parseGuardrailRules } from "@/lib/guardrails/policy";

type Tx = Prisma.TransactionClient;

export async function appendTraffic(
  siteId: string,
  input: {
    method: string;
    path: string;
    status: number | null;
    ip: string;
    userAgent: string;
    referer?: string;
    source: "server" | "browser" | "manual" | "demo";
    occurredAt?: string;
    isDemo?: boolean;
  },
  tx: Tx = prisma,
) {
  const classification = classifyUserAgent(input.userAgent);
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const since = new Date(Date.parse(occurredAt) - 60_000).toISOString();
  const priorSameIp = await tx.trafficEvent.count({
    where: { siteId, ip: input.ip, occurredAt: { gte: since, lt: occurredAt } },
  });
  const anomalies = detectAnomalies({
    userAgent: input.userAgent,
    classification,
    priorSameIp,
    source: input.source === "demo" ? "server" : input.source,
  });
  const last = await tx.trafficEvent.findFirst({ where: { siteId }, orderBy: { seq: "desc" } });
  const id = randomUUID();
  const anomalyCodes = anomalies.map((item) => item.code).sort().join("|");
  const chain = {
    id,
    occurredAt,
    siteId,
    method: input.method,
    path: input.path,
    status: input.status,
    ip: input.ip,
    userAgent: input.userAgent,
    agent: classification.agent ?? "",
    category: classification.category,
    source: input.source,
    anomalyCodes,
  };
  const prevHash = last?.hash ?? GENESIS;
  const hash = chainHash(prevHash, trafficPayload(chain));
  return tx.trafficEvent.create({
    data: {
      ...chain,
      seq: (last?.seq ?? 0) + 1,
      referer: input.referer ?? "",
      vendor: classification.vendor ?? "",
      confidence: classification.confidence,
      anomalyJson: JSON.stringify(anomalies),
      prevHash,
      hash,
      isDemo: input.isDemo ?? false,
    },
  });
}

export async function appendAgentEvent(
  siteId: string,
  input: {
    agentName: string;
    tool: string;
    outcome: string;
    content: string;
    occurredAt?: string;
    isDemo?: boolean;
  },
  tx: Tx = prisma,
) {
  const findings = reviewAgentCall({ tool: input.tool, outcome: input.outcome, content: input.content });
  const site = await tx.site.findUnique({ where: { id: siteId }, select: { userId: true } });
  const stored = site ? await tx.guardrailPolicy.findUnique({ where: { userId: site.userId } }) : null;
  let rules = DEFAULT_RULES;
  if (stored) {
    try {
      rules = parseGuardrailRules(JSON.parse(stored.rulesJson)) ?? DEFAULT_RULES;
    } catch {
      rules = DEFAULT_RULES;
    }
  }
  const decision = combineDecision({ tool: input.tool, content: input.content, findings, rules });
  const last = await tx.agentEvent.findFirst({ where: { siteId }, orderBy: { seq: "desc" } });
  const id = randomUUID();
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const findingIds = findings.map((finding) => finding.id).sort().join("|");
  const chain = {
    id,
    occurredAt,
    siteId,
    agentName: input.agentName.slice(0, 120),
    tool: input.tool.slice(0, 120),
    outcome: input.outcome.slice(0, 64),
    promptHash: hashPrompt(input.content),
    findingIds,
  };
  const prevHash = last?.hash ?? GENESIS;
  const hash = chainHash(prevHash, agentPayload(chain));
  return tx.agentEvent.create({
    data: {
      id,
      siteId,
      seq: (last?.seq ?? 0) + 1,
      occurredAt,
      agentName: chain.agentName,
      tool: chain.tool,
      outcome: chain.outcome,
      promptHash: chain.promptHash,
      findingsJson: JSON.stringify(findings),
      decision,
      prevHash,
      hash,
      isDemo: input.isDemo ?? false,
    },
  });
}
