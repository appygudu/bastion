import { ExposureChecker } from "@/components/exposure-checker";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Check if you're affected",
  description: "Look up breach names for an email or domain, check a password with k-anonymity, and read recent CISA and OSV advisories.",
};

export default function ExposurePage() {
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <main id="content" className="mx-auto max-w-3xl px-4 py-12 sm:px-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Exposure check</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Check if you&apos;re affected</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          See whether an email or a domain shows up in a public breach catalog, whether a password is in the Pwned Passwords range, and which exploited vulnerabilities and AI-package advisories the source feeds published. This page does not collect leaked passwords or message contents.
        </p>
        <div className="mt-8">
          <ExposureChecker />
        </div>
      </main>
    </div>
  );
}
