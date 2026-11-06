import Link from "next/link";
import { MarkReadButton } from "@/components/mark-read";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { emailConfigured } from "@/lib/notify/send";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const rows = await prisma.notification.findMany({ where: { userId: user.actorId }, orderBy: { createdAt: "desc" }, take: 40 });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Notifications</p>
          <h1 className="mt-2 font-serif text-4xl">In this account</h1>
        </div>
        <MarkReadButton />
      </div>
      <p className="max-w-2xl text-sm text-muted">In-app notices are stored for the signed-in person. Email is sent only for a Team workspace, and only when this deployment has RESEND_API_KEY and RESEND_FROM. Email is {emailConfigured() ? "configured" : "not configured"}.</p>
      {rows.length === 0 ? <p className="border border-dashed border-line p-6 text-sm text-muted">No notifications yet. A finished scan creates one.</p> : (
        <ul className="divide-y divide-line border border-line text-sm">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3">
              <p className={row.readAt ? "text-muted" : "text-paper"}>{row.title}</p>
              <p className="text-xs text-muted">{row.body}</p>
              <p className="mt-1 text-xs text-muted">{row.createdAt.toISOString()}{row.href ? <> · <Link className="text-brass" href={row.href}>Open</Link></> : null}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
