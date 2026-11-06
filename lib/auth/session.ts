import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashSecret, newSessionToken } from "@/lib/security/secrets";

export const SESSION_COOKIE = "bastion_session";
export const WORKSPACE_COOKIE = "bastion_workspace";
const FOURTEEN_DAYS = 60 * 60 * 24 * 14;

export type WorkspaceRole = "owner" | "admin" | "viewer";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  orgName: string;
  isDemo: boolean;
  plan: string;
  createdAt: Date;
  actorId: string;
  actorEmail: string;
  actorName: string;
  actorIsDemo: boolean;
  role: WorkspaceRole;
};

export function sessionCookieOptions() {
  const secure =
    process.env.COOKIE_SECURE === "true" ||
    (process.env.COOKIE_SECURE !== "false" &&
      (process.env.VERCEL === "1" || (process.env.APP_URL ?? "").startsWith("https://")));
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: FOURTEEN_DAYS,
  };
}

export async function createSession(userId: string) {
  const { token, hash } = newSessionToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + FOURTEEN_DAYS * 1000),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashSecret(token) } });
  }
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}

function present(
  owner: { id: string; email: string; name: string; orgName: string; isDemo: boolean; plan: string; createdAt: Date },
  actor: { id: string; email: string; name: string; isDemo: boolean },
  role: WorkspaceRole,
): SessionUser {
  return {
    id: owner.id,
    email: owner.email,
    name: owner.name,
    orgName: owner.orgName,
    isDemo: owner.isDemo,
    plan: owner.plan,
    createdAt: owner.createdAt,
    actorId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name,
    actorIsDemo: actor.isDemo,
    role,
  };
}

export async function setWorkspaceCookie(workspaceId: string | null) {
  const jar = await cookies();
  if (!workspaceId) {
    jar.set(WORKSPACE_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return;
  }
  jar.set(WORKSPACE_COOKIE, workspaceId, sessionCookieOptions());
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSecret(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  const actor = session.user;
  const requested = jar.get(WORKSPACE_COOKIE)?.value;
  if (requested && requested !== actor.id && !actor.isDemo) {
    const membership = await prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId: requested, userId: actor.id } },
    });
    if (membership && (membership.role === "admin" || membership.role === "viewer")) {
      const owner = await prisma.user.findUnique({ where: { id: requested } });
      if (owner && !owner.isDemo) return present(owner, actor, membership.role);
    }
  }
  return present(actor, actor, "owner");
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
