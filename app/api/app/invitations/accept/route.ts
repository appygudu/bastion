import { z } from "zod";
import { audit } from "@/lib/audit/log";
import { crossOriginDenied, jsonError, requireApiUser } from "@/lib/api";
import { setWorkspaceCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/security/rate-limit";
import { hashSecret } from "@/lib/security/secrets";

export const runtime = "nodejs";

const schema = z.object({ token: z.string().trim().min(10).max(200) });

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  if (user.actorIsDemo) return jsonError("The demo account cannot join a workspace.", 403);
  const gate = await rateLimitShared(`invite-accept:${user.actorId}`, 20, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many attempts.", 429);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("This invitation is not valid.", 400);
  const invite = await prisma.invitation.findUnique({ where: { tokenHash: hashSecret(parsed.data.token) } });
  if (!invite || invite.acceptedAt || invite.expiresAt.getTime() < Date.now()) {
    return jsonError("This invitation is not valid.", 400);
  }
  if (invite.email !== user.actorEmail.toLowerCase()) {
    return jsonError("Sign in with the email address that received the invitation.", 403);
  }
  if (invite.role !== "admin" && invite.role !== "viewer") return jsonError("This invitation is not valid.", 400);
  await prisma.membership.upsert({
    where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.actorId } },
    create: { workspaceId: invite.workspaceId, userId: user.actorId, role: invite.role },
    update: { role: invite.role },
  });
  await prisma.invitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  await setWorkspaceCookie(invite.workspaceId);
  await audit(invite.workspaceId, user.actorId, "invite.accept", invite.role);
  return Response.json({ workspaceId: invite.workspaceId, role: invite.role });
}
