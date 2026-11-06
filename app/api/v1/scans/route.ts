import { z } from "zod";
import { jsonError } from "@/lib/api";
import { requireApiKey } from "@/lib/auth/api-key";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/security/rate-limit";
import { SsrfError } from "@/lib/security/ssrf";
import { runScan } from "@/lib/scanner/run";
import { afterScan } from "@/lib/scans/followup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  url: z.string().trim().min(1).max(2048),
  attested: z.literal(true),
});

export async function GET(request: Request) {
  const { user, error } = await requireApiKey(request, "scans:read");
  if (!user || error) return error;
  const gate = await rateLimitShared(`api-scans:${user.id}`, 60, 60 * 60_000);
  if (!gate.ok) return jsonError("API rate limit reached.", 429, { retryAfterSec: gate.retryAfterSec });
  const scans = await prisma.scan.findMany({
    where: { userId: user.id, isDemo: false },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, url: true, status: true, score: true, createdAt: true },
  });
  return Response.json({ scans });
}

export async function POST(request: Request) {
  const { user, error } = await requireApiKey(request, "scans:write");
  if (!user || error) return error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Send a URL and attested: true.", 400);
  const limit = Number(process.env.BASTION_SCAN_RATE_LIMIT ?? 8);
  const windowMs = Number(process.env.BASTION_SCAN_WINDOW_MS ?? 60 * 60_000);
  const gate = await rateLimitShared(`scan:${user.id}`, limit, windowMs);
  if (!gate.ok) return jsonError("Scan rate limit reached.", 429, { retryAfterSec: gate.retryAfterSec });
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
        metaJson: JSON.stringify({ ...result.meta, attested: true, api: true }),
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
        metaJson: JSON.stringify({ attested: true, api: true }),
      },
    });
    return jsonError(message, blocked ? 400 : 502, { id: scan.id });
  }
}
