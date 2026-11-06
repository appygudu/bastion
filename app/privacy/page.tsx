import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Privacy",
  description: "What Bastion stores, what it forwards, and the one cookie it sets.",
};

export default function PrivacyPage() {
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <article id="content" className="mx-auto max-w-3xl space-y-8 px-4 py-12 text-sm leading-6 text-muted sm:px-5">
        <header>
          <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Privacy</p>
          <h1 className="mt-3 font-serif text-4xl text-paper">What this deployment handles</h1>
          <p className="mt-4">This notice describes the Bastion application. It is not a certification and it is not legal advice. The operator of a deployment is responsible for the database they attach.</p>
        </header>
        <section>
          <h2 className="font-serif text-2xl text-paper">Account data</h2>
          <p className="mt-3">A workspace stores the name, organization, email, and a bcrypt hash of the password. Sessions are random tokens stored only as a SHA-256 hash in an HttpOnly, SameSite=Lax cookie. The demo account is labelled and uses a published password.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-paper">Exposure checks</h2>
          <p className="mt-3">An email submitted to the exposure check is forwarded to the XposedOrNot breach-analytics API and, only when an API key is configured, to Have I Been Pwned. The address is not written to the database or to application logs. Rate-limit keys are hashes. Results keep breach names, dates, and data classes.</p>
          <p className="mt-3">A password is hashed in the browser. Only the first five characters of the SHA-1 digest are sent, either directly to the Pwned Passwords range API or, if that call fails, to Bastion so it can request the same range. The password and the full hash are not sent. There is no route that accepts them.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-paper">Cookies</h2>
          <p className="mt-3">The only cookie Bastion sets is the session cookie, and only after sign-in. It is strictly necessary for the workspace. This application does not set analytics or advertising cookies, so it does not show a consent banner.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-paper">Scans and feeds</h2>
          <p className="mt-3">A passive scan stores the URL, the score, and the findings for that workspace. The public demo cannot start a scan. Threat and advisory feeds are cached so a cold start can show the last successful fetch. Those records come from the public sources named on the page.</p>
        </section>
      </article>
    </div>
  );
}
