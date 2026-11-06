import { agentPayload, trafficPayload, verifyChain } from "@/lib/audit/hashchain";
import { prisma } from "@/lib/db";
import type { Finding, Pass } from "@/lib/types";
import { buildReport, type ReportModel } from "./model";

export async function assembleReport(userId: string, orgName: string, demo: boolean): Promise<ReportModel> {
  const [scan, review, sites] = await Promise.all([
    prisma.scan.findFirst({ where: { userId, status: "completed" }, orderBy: { createdAt: "desc" } }),
    prisma.dependencyReview.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.site.findMany({ where: { userId } }),
  ]);
  const siteIds = sites.map((site) => site.id);
  const [traffic, agents] = await Promise.all([
    prisma.trafficEvent.findMany({ where: { siteId: { in: siteIds } }, orderBy: [{ siteId: "asc" }, { seq: "asc" }] }),
    prisma.agentEvent.findMany({ where: { siteId: { in: siteIds } }, orderBy: [{ siteId: "asc" }, { seq: "asc" }] }),
  ]);
  const bySite = new Map<string, typeof traffic>();
  for (const row of traffic) {
    const list = bySite.get(row.siteId) ?? [];
    list.push(row);
    bySite.set(row.siteId, list);
  }
  let chainValid = true;
  for (const rows of bySite.values()) {
    const result = verifyChain(rows.map((row) => ({
      prevHash: row.prevHash,
      hash: row.hash,
      payload: trafficPayload({
        id: row.id,
        occurredAt: row.occurredAt,
        siteId: row.siteId,
        method: row.method,
        path: row.path,
        status: row.status,
        ip: row.ip,
        userAgent: row.userAgent,
        agent: row.agent,
        category: row.category,
        source: row.source,
        anomalyCodes: row.anomalyCodes,
      }),
    })));
    if (!result.ok) chainValid = false;
  }
  const counts = new Map<string, number>();
  for (const row of traffic) {
    const name = row.agent || row.category;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const agentFindings = agents.reduce((sum, row) => sum + (JSON.parse(row.findingsJson) as unknown[]).length, 0);
  const findings = scan ? (JSON.parse(scan.findingsJson) as Finding[]) : [];
  const passes = scan ? (JSON.parse(scan.passesJson) as Pass[]) : [];
  let vulnerable = 0;
  let packages = 0;
  let live = false;
  if (review) {
    const parsed = JSON.parse(review.resultJson) as { name: string; vulns: unknown[]; live?: boolean }[];
    packages = parsed.length;
    vulnerable = parsed.filter((item) => item.vulns.length > 0).length;
    live = !review.isDemo;
  }
  return buildReport({
    orgName,
    demo,
    scanScore: scan?.score ?? null,
    findings,
    passes,
    ledger: {
      events: traffic.length,
      agents: [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6),
      anomalies: traffic.filter((row) => row.anomalyCodes).length,
      chainValid: agentChain(agents) && chainValid,
    },
    agents: { events: agents.length, findings: agentFindings },
    dependencies: { packages, vulnerable, live },
  });
}

function agentChain(rows: { prevHash: string; hash: string; id: string; occurredAt: string; siteId: string; agentName: string; tool: string; outcome: string; promptHash: string; findingsJson: string }[]): boolean {
  const bySite = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = bySite.get(row.siteId) ?? [];
    list.push(row);
    bySite.set(row.siteId, list);
  }
  for (const group of bySite.values()) {
    const result = verifyChain(group.map((row) => ({
      prevHash: row.prevHash,
      hash: row.hash,
      payload: agentPayload({
        id: row.id,
        occurredAt: row.occurredAt,
        siteId: row.siteId,
        agentName: row.agentName,
        tool: row.tool,
        outcome: row.outcome,
        promptHash: row.promptHash,
        findingIds: (JSON.parse(row.findingsJson) as { id: string }[]).map((finding) => finding.id).sort().join("|"),
      }),
    })));
    if (!result.ok) return false;
  }
  return true;
}
