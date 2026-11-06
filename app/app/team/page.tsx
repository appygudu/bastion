import { InviteForm, MemberRoleForm, WorkspaceSwitch } from "@/components/invite-form";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { workspaceLimits } from "@/lib/workspace/limits";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const user = await requireUser();
  const [members, events, mine] = await Promise.all([
    prisma.membership.findMany({ where: { workspaceId: user.id }, include: { user: { select: { email: true, name: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.auditEvent.findMany({ where: { workspaceId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.membership.findMany({ where: { userId: user.actorId }, include: { workspace: { select: { id: true, orgName: true } } } }),
  ]);
  const limits = workspaceLimits(user.plan);
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Team</p>
        <h1 className="mt-2 font-serif text-4xl">People and audit</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">You are signed in as {user.actorEmail} with the {user.role} role. This {user.plan} workspace allows {limits.invites} members and open invitations. Viewers can read. Admins can change scans, keys, and policies. The owner invites people.</p>
      </div>
      <section>
        <h2 className="font-serif text-2xl">Members</h2>
        <ul className="mt-3 divide-y divide-line border border-line text-sm">
          <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <span>{user.email}</span>
            <span className="text-xs text-muted">Owner</span>
          </li>
          {members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span>{member.user.email}</span>
              <span className="flex items-center gap-3 text-xs text-muted">
                {member.role}
                {user.role === "owner" && !user.isDemo ? <MemberRoleForm userId={member.userId} /> : null}
              </span>
            </li>
          ))}
        </ul>
      </section>
      {user.role === "owner" && !user.isDemo ? <InviteForm /> : <p className="text-sm text-muted">{user.isDemo ? "The demo workspace cannot invite people." : "Only the owner can invite people."}</p>}
      {mine.length > 0 ? (
        <section>
          <h2 className="font-serif text-2xl">Workspaces you can open</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><WorkspaceSwitch id={user.actorId} label="Your workspace" /></li>
            {mine.map((membership) => (
              <li key={membership.id}><WorkspaceSwitch id={membership.workspaceId} label={`${membership.workspace.orgName} · ${membership.role}`} /></li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h2 className="font-serif text-2xl">Audit log</h2>
        {events.length === 0 ? <p className="mt-3 text-sm text-muted">No admin actions yet.</p> : (
          <ul className="mt-3 divide-y divide-line border border-line text-sm">
            {events.map((event) => (
              <li key={event.id} className="px-4 py-3">
                <p>{event.action}</p>
                <p className="text-xs text-muted">{event.target} · {event.createdAt.toISOString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
