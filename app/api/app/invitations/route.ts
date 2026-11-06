import { randomBytes } from "node:crypto";
import { z } from "zod";
import { audit } from "@/lib/audit/log";
import { crossOriginDenied, demoDenied, jsonError, ownerDenied, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/security/rate-limit";
import { hashSecret } from "@/lib/security/secrets";
import { workspaceLimits } from "@/lib/workspace/limits";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().email().max(180),
  role: z.enum(["admin", "viewer"]),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const denied = demoDenied(user) ?? ownerDenied(user);
  if (denied) return denied;
  const gate = await rateLimitShared(`invite:${user.id}`, 20, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many invitations.", 429, { retryAfterSec: gate.retryAfterSec });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter an email and a role of admin or viewer.", 400);
  const email = parsed.data.email.toLowerCase();
  if (email === user.email.toLowerCase()) return jsonError("That address is already the owner.", 400);
  const limits = workspaceLimits(user.plan);
  const openInvites = await prisma.invitation.count({ where: { workspaceId: user.id, acceptedAt: null, expiresAt: { gt: new Date() } } });
  const members = await prisma.membership.count({ where: { workspaceId: user.id } });
  if (openInvites + members >= limits.invites) {
    return jsonError(`This ${user.plan} workspace can have ${limits.invites} members and open invitations.`, 400);
  }
  const token = `inv_${randomBytes(24).toString("base64url")}`;
  await prisma.invitation.create({
    data: {
      workspaceId: user.id,
      email,
      role: parsed.data.role,
      tokenHash: hashSecret(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await audit(user.id, user.actorId, "invite.create", `${email} ${parsed.data.role}`);
  return Response.json({ token, email, role: parsed.data.role, expiresInDays: 7 });
}
