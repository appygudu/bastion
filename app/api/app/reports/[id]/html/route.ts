import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { renderReportHtml } from "@/lib/reports/html";
import type { ReportModel } from "@/lib/reports/model";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const { id } = await context.params;
  const report = await prisma.report.findFirst({ where: { id, userId: user.id } });
  if (!report) return new Response("Not found", { status: 404 });
  const html = renderReportHtml(JSON.parse(report.payloadJson) as ReportModel);
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
