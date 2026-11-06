import { notifyWorkspace } from "@/lib/notify/send";
import { deliverScanWebhook } from "@/lib/webhooks/deliver";

export async function afterScan(input: {
  userId: string;
  scanId: string;
  url: string;
  status: string;
  score: number;
  findingsJson: string;
  scheduled?: boolean;
}) {
  try {
    const findings = parseFindings(input.findingsJson);
    const high = findings.filter((finding) => finding.severity === "critical" || finding.severity === "high").length;
    const title = input.status === "completed" ? `Scan finished for ${hostOf(input.url)}` : `Scan ${input.status} for ${hostOf(input.url)}`;
    const body = input.status === "completed"
      ? `Score ${input.score}. ${findings.length} findings, ${high} critical or high.${input.scheduled ? " This was a weekly re-scan." : ""}`
      : `The scan did not complete (${input.status}).`;
    await notifyWorkspace(input.userId, {
      title,
      body,
      href: `/app/scan/${input.scanId}`,
      email: input.status === "completed",
    });
    if (input.status === "completed") {
      await deliverScanWebhook(input.userId, { scanId: input.scanId, url: input.url, score: input.score, findings });
    }
  } catch {
    // A notification or webhook failure does not change the saved scan.
  }
}

function hostOf(raw: string): string {
  try {
    return new URL(raw).hostname;
  } catch {
    return raw.slice(0, 80);
  }
}

function parseFindings(raw: string): { id: string; severity: string; title: string }[] {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as { id?: unknown; severity?: unknown; title?: unknown };
      if (typeof row.id !== "string" || typeof row.severity !== "string" || typeof row.title !== "string") return [];
      return [{ id: row.id, severity: row.severity, title: row.title }];
    });
  } catch {
    return [];
  }
}
