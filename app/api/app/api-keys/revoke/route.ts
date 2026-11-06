import { z } from "zod";
import { audit } from "@/lib/audit/log";
import { crossOriginDenied, demoDenied, jsonError, requireApiUser, viewerDenied } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({ id: z.string().min(1).max(40) });

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const denied = demoDenied(user) ?? viewerDenied(user);
  if (denied) return denied;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Choose a key.", 400);
  const row = await prisma.apiKey.findFirst({ where: { id: parsed.data.id, userId: user.id, revokedAt: null } });
  if (!row) return jsonError("That key is not active.", 404);
  await prisma.apiKey.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
  await audit(user.id, user.actorId, "apikey.revoke", row.id);
  return Response.json({ id: row.id, revoked: true });
}
