import { z } from "zod";
import { crossOriginDenied, demoDenied, jsonError, requireApiUser, viewerDenied } from "@/lib/api";
import { prisma } from "@/lib/db";
import { weeklyNext, sameAssessedUrl } from "@/lib/scans/schedule";
import { rateLimitShared } from "@/lib/security/rate-limit";
import { workspaceLimits } from "@/lib/workspace/limits";

export const runtime = "nodejs";

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
  if (!workspaceLimits(user.plan).schedules) {
    return jsonError("Weekly re-scans are on the Team plan. Submit a PayPal claim and wait for the operator to approve it.", 403);
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Confirm authority and choose a host you have already assessed.", 400);
  const gate = await rateLimitShared(`schedule:${user.id}`, 10, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many schedule changes. Wait before trying again.", 429, { retryAfterSec: gate.retryAfterSec });
  const scans = await prisma.scan.findMany({
    where: { userId: user.id, status: "completed", isDemo: false },
    select: { url: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  if (!sameAssessedUrl(parsed.data.url, scans.map((scan) => scan.url))) {
    return jsonError("Weekly re-scans are only available for a host this workspace has already assessed.", 400);
  }
  const count = await prisma.scanSchedule.count({ where: { userId: user.id, enabled: true } });
  const existing = await prisma.scanSchedule.findUnique({ where: { userId_url: { userId: user.id, url: parsed.data.url } } });
  if (!existing && count >= 5) return jsonError("This workspace already has 5 weekly re-scans.", 400);
  const row = await prisma.scanSchedule.upsert({
    where: { userId_url: { userId: user.id, url: parsed.data.url } },
    create: { userId: user.id, url: parsed.data.url, nextRunAt: weeklyNext(), enabled: true },
    update: { enabled: true, nextRunAt: weeklyNext(), lastError: null },
  });
  return Response.json({ id: row.id, url: row.url, nextRunAt: row.nextRunAt.toISOString() });
}
