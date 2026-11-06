import { redirect } from "next/navigation";
import { crossOriginDenied, requireApiUser, viewerDenied } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assembleReport } from "@/lib/reports/assemble";

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const denied = viewerDenied(user);
  if (denied) return denied;
  const model = await assembleReport(user.id, user.orgName, user.isDemo);
  const report = await prisma.report.create({
    data: {
      userId: user.id,
      title: model.title,
      score: model.score,
      payloadJson: JSON.stringify(model),
      isDemo: user.isDemo,
    },
  });
  redirect(`/app/reports/${report.id}`);
}
