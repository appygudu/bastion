import Link from "next/link";
import { SecurityReviewForm } from "@/components/security-review-form";
import { SiteHeader } from "@/components/site-header";
import { enterpriseContact } from "@/lib/public-env";

export const metadata = {
  title: "Enterprise",
  description: "Request a security review of Bastion. No certification is claimed.",
};

export default function EnterprisePage() {
  const contact = enterpriseContact();
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <main id="content" className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-5 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="space-y-6 text-sm leading-6 text-muted">
          <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Enterprise</p>
          <h1 className="font-serif text-4xl text-paper sm:text-5xl">A review you can ask for</h1>
          <p>Bastion can be evaluated as a passive scanner, a crawler ledger, and an agent guardrail log. It is not certified, it has no customers to name, and SAML is not built.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>OIDC sign-in works when Google or a generic issuer is configured. The login page says when it is not.</li>
            <li>Workspaces have an owner, admins, and viewers, with invitation links and an audit log.</li>
            <li>API keys carry scans:read and scans:write. The OpenAPI document is public.</li>
            <li>A PayPal link is checkout only. The plan changes when an operator approves the claim.</li>
          </ul>
          <p>The honest limits are on <Link className="text-brass underline" href="/pitch">the readiness page</Link> and in the <Link className="text-brass underline" href="/docs/security">security whitepaper</Link>.</p>
          {contact?.kind === "email" ? <p>Published contact: <a className="text-brass underline" href={`mailto:${contact.value}`}>{contact.value}</a></p> : null}
          {contact?.kind === "url" ? <p>Published contact: <a className="text-brass underline" href={contact.value}>{contact.value}</a></p> : null}
          {!contact ? <p>This deployment has not set NEXT_PUBLIC_ENTERPRISE_CONTACT. The form still stores the request for the operator.</p> : null}
        </article>
        <section className="border border-line bg-ink p-5">
          <h2 className="font-serif text-2xl text-paper">Request a security review</h2>
          <p className="mt-2 text-sm text-muted">Stored in the database. Visible to the operator in the admin view. If email is configured, the first ADMIN_EMAILS address is notified. That is not an acknowledgement of a contract.</p>
          <div className="mt-4"><SecurityReviewForm /></div>
        </section>
      </main>
    </div>
  );
}
