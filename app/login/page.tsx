import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/auth/next-path";
import { SiteHeader } from "@/components/site-header";
import { oidcProviders } from "@/lib/auth/oidc";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);
  const providers = oidcProviders();
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader cta="signin" />
      <main id="content" className="mx-auto grid max-w-5xl items-center gap-12 px-5 py-12 md:grid-cols-2">
        <div>
          <h1 className="font-serif text-4xl">Sign in to the workspace.</h1>
          <p className="mt-4 text-sm text-muted">Sessions are random tokens stored only as a hash. Passwords are hashed with bcrypt.</p>
          <div className="mt-8 border border-line bg-ink-2 p-4 text-sm">
            <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Demo workspace</p>
            <p className="mt-2">Email <span className="font-mono text-paper">{DEMO_EMAIL}</span></p>
            <p>Password <span className="font-mono text-paper">{DEMO_PASSWORD}</span></p>
            <p className="mt-2 text-muted">Seeded Northwind Labs data. It is labelled demo and was not collected from a live customer.</p>
          </div>
        </div>
        <div className="border border-line bg-ink p-6">
          <AuthForm mode="login" nextPath={nextPath} />
          <div className="mt-4 border-t border-line pt-4 text-sm">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">SSO</p>
            {params.error === "sso" ? <p className="mt-2 text-clay" role="alert">SSO did not finish. The provider may be misconfigured, or the email was not verified.</p> : null}
            {providers.length === 0 ? (
              <p className="mt-2 text-muted">SSO is not configured on this deployment. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or OIDC_ISSUER, OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET. SAML is not implemented.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {providers.map((provider) => (
                  <li key={provider.id}>
                    <a className="text-brass underline" href={`/api/auth/oidc/start?provider=${provider.id}`}>Continue with {provider.label}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-4 text-sm text-muted">No workspace yet? <Link href="/signup" className="text-brass">Create one</Link>.</p>
        </div>
      </main>
    </div>
  );
}
