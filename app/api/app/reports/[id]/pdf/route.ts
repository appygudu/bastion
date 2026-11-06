import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { ReportModel } from "@/lib/reports/model";
import { renderReportPdf } from "@/lib/reports/pdf";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const { id } = await context.params;
  const report = await prisma.report.findFirst({ where: { id, userId: user.id } });
  if (!report) return new Response("Not found", { status: 404 });
  const pdf = await renderReportPdf(JSON.parse(report.payloadJson) as ReportModel);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="bastion-brief.pdf"`,
    },
  });
}
