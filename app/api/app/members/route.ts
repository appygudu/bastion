import { z } from "zod";
import { audit } from "@/lib/audit/log";
import { crossOriginDenied, demoDenied, jsonError, ownerDenied, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  userId: z.string().min(1).max(40),
  role: z.enum(["admin", "viewer", "remove"]),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const denied = demoDenied(user) ?? ownerDenied(user);
  if (denied) return denied;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Choose a member and a role.", 400);
  if (parsed.data.userId === user.id) return jsonError("The owner role stays with this account.", 400);
  const membership = await prisma.membership.findUnique({
    where: { workspaceId_userId: { workspaceId: user.id, userId: parsed.data.userId } },
  });
  if (!membership) return jsonError("That person is not a member.", 404);
  if (parsed.data.role === "remove") {
    await prisma.membership.delete({ where: { id: membership.id } });
    await audit(user.id, user.actorId, "member.remove", parsed.data.userId);
    return Response.json({ ok: true });
  }
  await prisma.membership.update({ where: { id: membership.id }, data: { role: parsed.data.role } });
  await audit(user.id, user.actorId, "member.role", `${parsed.data.userId} ${parsed.data.role}`);
  return Response.json({ ok: true, role: parsed.data.role });
}
