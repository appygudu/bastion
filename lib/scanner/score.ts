import type { Severity } from "@/lib/types";

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 15,
  high: 8,
  medium: 4,
  low: 1,
  info: 0,
};

export function scoreFindings(findings: { severity: Severity }[]): number {
  const penalty = findings.reduce((sum, finding) => sum + SEVERITY_WEIGHT[finding.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function scoreBand(score: number): string {
  if (score >= 90) return "Controlled";
  if (score >= 75) return "Watch";
  if (score >= 50) return "Elevated";
  if (score >= 25) return "Exposed";
  return "Critical";
}
