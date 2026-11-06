import { scoreBand } from "@/lib/scanner/score";
import type { Finding, Severity } from "@/lib/types";

export interface ReportModel {
  title: string;
  orgName: string;
  generatedAt: string;
  demo: boolean;
  score: number;
  band: string;
  narrative: string;
  findings: Finding[];
  passes: { title: string; evidence: string }[];
  roadmap: { horizon: string; items: string[] }[];
  frameworks: { name: string; how: string }[];
  ledger: { events: number; agents: { name: string; count: number }[]; anomalies: number; chainValid: boolean };
  agents: { events: number; findings: number };
  dependencies: { packages: number; vulnerable: number; live: boolean };
  limitations: string[];
}

const ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export function buildReport(input: {
  orgName: string;
  demo: boolean;
  scanScore: number | null;
  findings: Finding[];
  passes: { title: string; evidence: string }[];
  ledger: ReportModel["ledger"];
  agents: ReportModel["agents"];
  dependencies: ReportModel["dependencies"];
  generatedAt?: string;
}): ReportModel {
  let score = input.scanScore ?? 100;
  score -= Math.min(16, input.agents.findings * 4);
  score -= Math.min(10, input.ledger.anomalies * 2);
  score -= Math.min(12, input.dependencies.vulnerable * 3);
  score = Math.max(0, Math.min(100, score));
  const ranked = [...input.findings].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
  const immediate = ranked.filter((finding) => finding.severity === "critical" || finding.severity === "high").slice(0, 5);
  const next = ranked.filter((finding) => finding.severity === "medium").slice(0, 5);
  const later = ranked.filter((finding) => finding.severity === "low" || finding.severity === "info").slice(0, 5);
  return {
    title: `${input.orgName} posture brief`,
    orgName: input.orgName,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    demo: input.demo,
    score,
    band: scoreBand(score),
    narrative: narrative(score, input),
    findings: ranked.slice(0, 25),
    passes: input.passes.slice(0, 12),
    roadmap: [
      { horizon: "This week", items: immediate.map((finding) => finding.title) },
      { horizon: "This month", items: next.map((finding) => finding.title) },
      { horizon: "This quarter", items: later.map((finding) => finding.title).concat("Export the hash-chained ledger to storage the application administrators cannot rewrite.") },
    ].map((item) => ({ ...item, items: item.items.length ? item.items : ["No items in this horizon from the current evidence."] })),
    frameworks: [
      {
        name: "OWASP Top 10:2025",
        how: "Header, cookie, CORS, and exposure findings map to Security Misconfiguration, Cryptographic Failures, Broken Access Control, and Injection. The ledger supports Logging and Alerting Failures.",
      },
      {
        name: "OWASP API Security Top 10:2023",
        how: "CORS reflection and sensitive-path exposure are treated as authorization and misconfiguration evidence. This product does not test object-level authorization.",
      },
      {
        name: "OWASP Top 10 for LLM Applications 2025",
        how: "Agent tool-call indicators are labelled with the matching LLM category. They are heuristics, not a model firewall.",
      },
      {
        name: "NIST CSF 2.0",
        how: "Passive review supports PR.PS and PR.DS. The ledger and anomaly flags support DE.CM and DE.AE. Dependency review supports GV.SC and PR.PS-02. Reports support GV.OV.",
      },
      {
        name: "NIST AI RMF 1.0",
        how: "Policy generation supports GOVERN. The agent log supports MEASURE and MANAGE. Bastion does not measure model accuracy or bias.",
      },
      {
        name: "ISO/IEC 27001:2022 A.8.15 and SOC 2 CC7.2",
        how: "The ledger records who-like actor labels, time, path, and source, and chains hashes so casual edits are detectable. It is not a certified control.",
      },
    ],
    ledger: input.ledger,
    agents: input.agents,
    dependencies: input.dependencies,
    limitations: [
      "The posture index is a weighted heuristic over passive checks plus logged anomalies. It is not a certification, a penetration test, or a probability of breach.",
      "Bastion does not exploit findings, brute-force credentials, or send payloads that modify data.",
      "robots.txt and ai.txt are preferences. Enforcement requires the generated middleware or an edge control you operate.",
      "User-Agent classification can be spoofed. Bastion does not verify crawler source ranges in this version.",
      "The hash chain detects changes inside this database. An administrator who can rewrite every row can rebuild the chain. Export the JSON to storage with separate access.",
      "OSV.dev results are only as current as that public database at query time. Unpinned versions are not queried.",
      input.demo ? "This brief includes the labelled Northwind Labs demo fixture. Those rows were not collected from a live customer system." : "Live scan results reflect the moment of the request only.",
    ],
  };
}

function narrative(score: number, input: { findings: Finding[]; ledger: ReportModel["ledger"]; agents: ReportModel["agents"] }): string {
  const band = scoreBand(score);
  const critical = input.findings.filter((finding) => finding.severity === "critical").length;
  return `${band} posture (${score}/100). ${critical} critical web finding(s) are in the current evidence. The ledger holds ${input.ledger.events} request(s), ${input.ledger.anomalies} of them flagged, and ${input.agents.findings} agent-guardrail finding(s).`;
}
