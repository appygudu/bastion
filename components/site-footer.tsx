import Link from "next/link";

const groups = [
  {
    title: "Product",
    links: [
      ["/threats", "Global attacks"],
      ["/exposure", "Exposure check"],
      ["/pricing", "Pricing"],
      ["/docs", "Docs"],
      ["/docs/api", "API"],
      ["/demo", "Demo"],
      ["/enterprise", "Enterprise"],
      ["/pitch", "Readiness"],
    ],
  },
  {
    title: "Company",
    links: [
      ["/about", "About"],
      ["/changelog", "Changelog"],
      ["/status", "Status"],
      ["/security", "Security"],
      ["/privacy", "Privacy"],
      ["/terms", "Terms"],
      ["/acceptable-use", "Acceptable use"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-5 sm:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-serif text-xl text-paper">Bastion</p>
          <p className="mt-2 max-w-sm text-sm text-muted">A defensive workspace for sites and agents you operate. © 2026 Flyhigh. All rights reserved.</p>
        </div>
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{group.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {group.links.map(([href, label]) => (
                <li key={href}><Link href={href} className="text-muted hover:text-paper">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
