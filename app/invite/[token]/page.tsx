import Link from "next/link";
import { AcceptInvite } from "@/components/accept-invite";
import { getCurrentUser } from "@/lib/auth/session";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Invitation" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  const next = `/invite/${encodeURIComponent(token)}`;
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader cta="signin" />
      <main id="content" className="mx-auto max-w-xl px-5 py-16">
        <h1 className="font-serif text-4xl">Workspace invitation</h1>
        <p className="mt-4 text-sm leading-6 text-muted">Accepting adds your signed-in account as an admin or a viewer. The link is valid for seven days and works once. The invited email has to match the account.</p>
        <div className="mt-8">
          {user ? <AcceptInvite token={token} /> : (
            <p className="text-sm">
              <Link className="text-brass underline" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
              {" or "}
              <Link className="text-brass underline" href={`/signup?next=${encodeURIComponent(next)}`}>create an account</Link>
              , then open this link again.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
