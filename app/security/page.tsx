import { readFile } from "node:fs/promises";
import { SiteHeader } from "@/components/site-header";
import { securityContact } from "@/lib/public-env";

export const metadata = { title: "Security", description: "How Bastion handles its own security, and how to report a problem." };

export default async function SecurityPage() {
  const text = await readFile("SECURITY.md", "utf8");
  const contact = securityContact();
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <article id="content" className="mx-auto max-w-3xl px-4 py-12 sm:px-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Security</p>
        <h1 className="mt-3 font-serif text-4xl text-paper">Responsible disclosure</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          {contact ? (
            <>Report a defect in this deployment to <a className="text-brass underline" href={`mailto:${contact}`}>{contact}</a>. </>
          ) : (
            <>This deployment has not published a disclosure address. Report a defect to the operator through their own process. </>
          )}
          Do not test the defect against systems you do not own. This is not a public bug-bounty program. A machine-readable copy is at <a className="text-brass underline" href="/.well-known/security.txt">/.well-known/security.txt</a>.
        </p>
        <pre className="mt-8 whitespace-pre-wrap font-sans text-sm leading-6 text-muted">{text}</pre>
      </article>
    </div>
  );
}
