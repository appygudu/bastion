import { z } from "zod";
import { crossOriginDenied, jsonError, requireApiUser } from "@/lib/api";
import { setWorkspaceCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({ workspaceId: z.string().min(1).max(40) });

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  if (user.actorIsDemo) return jsonError("The demo account has one workspace.", 403);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Choose a workspace.", 400);
  if (parsed.data.workspaceId === user.actorId) {
    await setWorkspaceCookie(null);
    return Response.json({ workspaceId: user.actorId, role: "owner" });
  }
  const membership = await prisma.membership.findUnique({
    where: { workspaceId_userId: { workspaceId: parsed.data.workspaceId, userId: user.actorId } },
  });
  if (!membership) return jsonError("You are not a member of that workspace.", 403);
  await setWorkspaceCookie(parsed.data.workspaceId);
  return Response.json({ workspaceId: parsed.data.workspaceId, role: membership.role });
}
