import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/auth/next-path";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Create workspace" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader cta="signin" />
      <main id="content" className="mx-auto grid max-w-5xl items-center gap-12 px-5 py-12 md:grid-cols-2">
        <div>
          <h1 className="font-serif text-4xl">A workspace for one team.</h1>
          <p className="mt-4 text-sm text-muted">Use a real work email. Accounts live in this deployment&apos;s database: SQLite on a laptop, hosted Postgres on Vercel. Invitations add admins and viewers. This is not a SCIM directory, and SAML is not built.</p>
        </div>
        <div className="border border-line bg-ink p-6">
          <AuthForm mode="signup" nextPath={nextPath} />
          <p className="mt-4 text-sm text-muted">Already registered? <Link href="/login" className="text-brass">Sign in</Link>. Creating a workspace does not charge a card. The <Link href="/privacy" className="text-brass">privacy notice</Link> and <Link href="/terms" className="text-brass">terms</Link> describe what is stored.</p>
        </div>
      </main>
    </div>
  );
}
