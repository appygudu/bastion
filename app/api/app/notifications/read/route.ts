import { crossOriginDenied, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  await prisma.notification.updateMany({ where: { userId: user.actorId, readAt: null }, data: { readAt: new Date() } });
  return Response.json({ ok: true });
}
