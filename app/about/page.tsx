import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "About",
  description: "What Bastion is, and what the Northwind numbers on the landing page are.",
};

export default function AboutPage() {
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <article id="content" className="mx-auto max-w-3xl space-y-8 px-4 py-12 text-sm leading-6 text-muted sm:px-5">
        <header>
          <p className="text-[11px] uppercase tracking-[0.18em] text-brass">About</p>
          <h1 className="mt-3 font-serif text-4xl text-paper">A defensive workspace, not an attack tool</h1>
          <p className="mt-4">Bastion is built by Flyhigh. It gives a team a passive read of sites they operate, a ledger of AI crawlers and agent tool calls, and a brief an executive can read. It does not exploit findings.</p>
        </header>
        <section>
          <h2 className="font-serif text-2xl text-paper">What the public pages do</h2>
          <p className="mt-3">The exposure check looks up breach metadata and a k-anonymity password range. Global attacks lists records fetched from public feeds, each with its source link and date. Neither page is a complete view of the internet.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-paper">The Northwind numbers</h2>
          <p className="mt-3">Scores and findings labelled Northwind or demo are a fixture seeded into the demo workspace. They are not a customer, a live scan, or a statistic about Bastion&apos;s users. This site does not publish customer logos or a user count.</p>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-paper">Where to read more</h2>
          <p className="mt-3"><Link className="text-brass underline" href="/docs">Product docs</Link>, <Link className="text-brass underline" href="/security">security</Link>, <Link className="text-brass underline" href="/privacy">privacy</Link>, and <Link className="text-brass underline" href="/pricing">pricing</Link>.</p>
        </section>
      </article>
    </div>
  );
}
