import { WorkspaceShell } from "@/components/workspace-shell";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await prisma.notification.count({ where: { userId: user.actorId, readAt: null } });
  return (
    <WorkspaceShell
      orgName={user.orgName}
      email={user.actorEmail}
      isDemo={user.isDemo}
      role={user.role}
      plan={user.plan}
      unread={unread}
      admin={isPlatformAdmin(user)}
    >
      {children}
    </WorkspaceShell>
  );
}
