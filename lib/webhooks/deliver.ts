import { prisma } from "@/lib/db";
import { openSecret, signBody } from "@/lib/security/seal";
import { assertPublicHttpUrl, resolvePublicAddress, SsrfError } from "@/lib/security/ssrf";

export async function deliverScanWebhook(
  userId: string,
  payload: { scanId: string; url: string; score: number; findings: { id: string; severity: string; title: string }[] },
) {
  const hooks = await prisma.webhookEndpoint.findMany({ where: { userId, enabled: true }, take: 10 });
  const body = JSON.stringify({
    event: "scan.completed",
    scanId: payload.scanId,
    url: payload.url,
    score: payload.score,
    findingCount: payload.findings.length,
    findings: payload.findings.slice(0, 30).map((finding) => ({
      id: finding.id,
      severity: finding.severity,
      title: finding.title,
    })),
  });
  for (const hook of hooks) {
    try {
      const url = assertPublicHttpUrl(hook.url);
      if (url.protocol !== "https:") throw new SsrfError("Webhooks require https.");
      await resolvePublicAddress(url.hostname);
      const secret = openSecret(hook.secretCipher);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Bastion-Webhook",
          "x-bastion-event": "scan.completed",
          "x-bastion-signature": `sha256=${signBody(secret, body)}`,
        },
        body,
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });
      await prisma.webhookEndpoint.update({
        where: { id: hook.id },
        data: { lastStatus: response.status, lastError: null, lastDeliveryAt: new Date() },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delivery failed.";
      await prisma.webhookEndpoint.update({
        where: { id: hook.id },
        data: { lastStatus: 0, lastError: message.slice(0, 200), lastDeliveryAt: new Date() },
      }).catch(() => undefined);
    }
  }
}
