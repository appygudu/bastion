import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { weeklyNext } from "@/lib/scans/schedule";
import { SsrfError } from "@/lib/security/ssrf";
import { runScan } from "@/lib/scanner/run";
import { afterScan } from "@/lib/scans/followup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return jsonError("Scheduled re-scans are not armed on this deployment.", 503);
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return jsonError("Unauthorized.", 401);
  const due = await prisma.scanSchedule.findMany({
    where: { enabled: true, nextRunAt: { lte: new Date() }, user: { isDemo: false } },
    orderBy: { nextRunAt: "asc" },
    take: 3,
    include: { user: { select: { id: true, isDemo: true } } },
  });
  const results: { id: string; status: string }[] = [];
  for (const schedule of due) {
    try {
      const result = await runScan(schedule.url);
      const saved = await prisma.scan.create({
        data: {
          userId: schedule.userId,
          url: schedule.url,
          status: "completed",
          score: result.score,
          findingsJson: JSON.stringify(result.findings),
          passesJson: JSON.stringify(result.passes),
          metaJson: JSON.stringify({ ...result.meta, attested: true, scheduled: true }),
        },
      });
      await prisma.scanSchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: new Date(), lastStatus: "completed", lastError: null, nextRunAt: weeklyNext() },
      });
      await afterScan({
        userId: schedule.userId,
        scanId: saved.id,
        url: saved.url,
        status: saved.status,
        score: saved.score,
        findingsJson: saved.findingsJson,
        scheduled: true,
      });
      results.push({ id: schedule.id, status: "completed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scan failed.";
      await prisma.scanSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          lastStatus: error instanceof SsrfError ? "blocked" : "failed",
          lastError: message.slice(0, 300),
          nextRunAt: weeklyNext(),
        },
      });
      results.push({ id: schedule.id, status: error instanceof SsrfError ? "blocked" : "failed" });
    }
  }
  return Response.json({ ran: results.length, results });
}
