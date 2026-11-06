import { z } from "zod";
import { crossOriginDenied, demoDenied, jsonError, requireApiUser, viewerDenied } from "@/lib/api";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/security/rate-limit";
import { SsrfError } from "@/lib/security/ssrf";
import { runScan } from "@/lib/scanner/run";
import { afterScan } from "@/lib/scans/followup";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  url: z.string().trim().min(1).max(2048),
  attested: z.literal(true),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const denied = demoDenied(user) ?? viewerDenied(user);
  if (denied) return denied;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Confirm ownership and enter an http or https URL.", 400);
  }
  const limit = Number(process.env.BASTION_SCAN_RATE_LIMIT ?? 8);
  const windowMs = Number(process.env.BASTION_SCAN_WINDOW_MS ?? 60 * 60_000);
  const gate = await rateLimitShared(`scan:${user.id}`, limit, windowMs);
  if (!gate.ok) return jsonError("Scan rate limit reached. Wait before assessing another host.", 429, { retryAfterSec: gate.retryAfterSec });

  try {
    const result = await runScan(parsed.data.url);
    const scan = await prisma.scan.create({
      data: {
        userId: user.id,
        url: parsed.data.url,
        status: "completed",
        score: result.score,
        findingsJson: JSON.stringify(result.findings),
        passesJson: JSON.stringify(result.passes),
        metaJson: JSON.stringify({ ...result.meta, attested: true }),
      },
    });
    await afterScan({ userId: user.id, scanId: scan.id, url: scan.url, status: scan.status, score: scan.score, findingsJson: scan.findingsJson });
    return Response.json({ id: scan.id, score: scan.score });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed.";
    const blocked = err instanceof SsrfError;
    const scan = await prisma.scan.create({
      data: {
        userId: user.id,
        url: parsed.data.url,
        status: blocked ? "blocked" : "failed",
        error: message,
        metaJson: JSON.stringify({ attested: true }),
      },
    });
    return jsonError(message, blocked ? 400 : 502, { id: scan.id });
  }
}
