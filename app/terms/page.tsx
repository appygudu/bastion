import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Terms",
  description: "The terms for using Bastion as a defensive tool on systems you operate.",
};

export default function TermsPage() {
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <article id="content" className="mx-auto max-w-3xl space-y-8 px-4 py-12 text-sm leading-6 text-muted sm:px-5">
        <header>
          <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Terms</p>
          <h1 className="mt-3 font-serif text-4xl text-paper">Use Bastion on systems you operate</h1>
          <p className="mt-4">These terms are the product rules for this software. They are not a warranty, a service-level agreement, or a certification. © 2026 Flyhigh. All rights reserved.</p>
        </header>
        <section>
          <h2 className="font-serif text-2xl text-paper">Acceptable use</h2>
          <p className="mt-3">You may assess hosts you own or have written authority to assess. The <Link className="text-brass underline" href="/acceptable-use">acceptable use</Link> page is part of these terms. The public demo is read-only and must not be used to send traffic to a third party.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-paper">Results</h2>
          <p className="mt-3">Findings, scores, breach lookups, and threat records are informational. A clean result is not proof of safety. Feed text is copied or derived from the cited source and can be wrong or incomplete. General guidance on the threats page is not a statement by the authority that published the record.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-paper">Accounts and payment</h2>
          <p className="mt-3">Creating a workspace does not charge a card. A payment link, when the operator configures one, is collected by that payment provider, not by this application. Until a webhook exists, paying does not by itself change the workspace plan.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-paper">Liability</h2>
          <p className="mt-3">The software is provided as a defensive aid. You are responsible for the hosts you point it at and for the backups of the database you attach.</p>
        </section>
      </article>
    </div>
  );
}
