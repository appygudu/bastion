import { jsonError } from "@/lib/api";
import { requireApiKey } from "@/lib/auth/api-key";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiKey(request, "scans:read");
  if (!user || error) return error;
  const gate = await rateLimitShared(`api-scans:${user.id}`, 60, 60 * 60_000);
  if (!gate.ok) return jsonError("API rate limit reached.", 429, { retryAfterSec: gate.retryAfterSec });
  const { id } = await context.params;
  const scan = await prisma.scan.findFirst({ where: { id, userId: user.id, isDemo: false } });
  if (!scan) return jsonError("Scan not found.", 404);
  return Response.json({
    id: scan.id,
    url: scan.url,
    status: scan.status,
    score: scan.score,
    error: scan.error,
    createdAt: scan.createdAt,
    findings: JSON.parse(scan.findingsJson),
    passes: JSON.parse(scan.passesJson),
  });
}
