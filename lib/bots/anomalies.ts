import type { Severity } from "@/lib/types";
import type { Classification } from "./classify";

export interface Anomaly {
  code: string;
  severity: Severity;
  detail: string;
}

export function detectAnomalies(input: {
  userAgent: string;
  classification: Classification;
  priorSameIp: number;
  source: "server" | "browser" | "manual" | "demo";
}): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const ua = input.userAgent ?? "";
  const vendors = new Set(input.classification.matches.map((match) => match.vendor));
  if (vendors.size > 1) {
    anomalies.push({
      code: "conflicting-identity",
      severity: "low",
      detail: `User-Agent contains tokens from ${[...vendors].join(" and ")}. That is a spoofing hint, not proof of who connected.`,
    });
  }
  if (input.classification.matches.length && /curl\/|python-requests|wget\/|headlesschrome/i.test(ua)) {
    anomalies.push({
      code: "mixed-client",
      severity: "low",
      detail:
        "A declared crawler token appears next to a script or headless-browser marker. Treat this as a spoofing hint and check the source against the operator's published ranges.",
    });
  }
  const count = input.priorSameIp + 1;
  if (count >= 40) {
    anomalies.push({
      code: "burst-rate",
      severity: "high",
      detail: `${count} requests from this IP were recorded in the last 60 seconds.`,
    });
  } else if (count >= 15) {
    anomalies.push({
      code: "burst-rate",
      severity: "medium",
      detail: `${count} requests from this IP were recorded in the last 60 seconds.`,
    });
  }
  if (!ua.trim()) {
    anomalies.push({
      code: "missing-ua",
      severity: "low",
      detail: "The request arrived without a User-Agent.",
    });
  } else if (ua.length > 400) {
    anomalies.push({
      code: "oversized-ua",
      severity: "low",
      detail: "The User-Agent is unusually long.",
    });
  }
  if (input.classification.category === "automation") {
    anomalies.push({
      code: "unknown-automation",
      severity: "low",
      detail: "The client looks automated, and it does not match a catalogued AI or search agent.",
    });
  }
  if (input.source === "browser") {
    anomalies.push({
      code: "untrusted-source",
      severity: "info",
      detail: "Browser ingest can be forged by anyone who can read the page. Prefer the server middleware for an authoritative ledger.",
    });
  }
  return anomalies;
}
