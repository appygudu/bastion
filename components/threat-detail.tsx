import type { ThreatIncident, ThreatPrecaution } from "@/lib/threats/model";

const AUDIENCE: Record<ThreatPrecaution["audience"], string> = {
  organisations: "Organisations",
  individuals: "Individuals",
  "ai-systems": "AI, LLM, and agent systems",
};

export function ThreatDetail({ incident }: { incident: ThreatIncident }) {
  return (
    <article className="space-y-6">
      <header>
        <p className="text-xs text-muted">
          <time dateTime={incident.date}>{incident.date}</time>
          <span> · {incident.id}</span>
        </p>
        <h2 id="threat-title" className="mt-2 font-serif text-3xl text-paper">{incident.title}</h2>
        <p className="mt-2 text-sm">
          <span className={incident.severity === "unknown" ? "uppercase text-muted" : `uppercase sev-${incident.severity}`}>{incident.severity}</span>
          <span className="text-muted">{incident.exploited ? " · Exploited in the wild, as marked by a source" : " · Not marked exploited in the wild by these sources"}</span>
          {incident.aiRelated ? <span className="text-muted"> · AI, LLM, or agent keyword</span> : null}
        </p>
      </header>

      <section aria-labelledby="threat-happened">
        <h3 id="threat-happened" className="font-serif text-xl">What happened</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{incident.summary}</p>
      </section>

      <section aria-labelledby="threat-affected">
        <h3 id="threat-affected" className="font-serif text-xl">What is affected</h3>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-muted">Products</dt>
            <dd className="text-paper">{incident.products.length ? incident.products.join(", ") : "Not stated by the source."}</dd>
          </div>
          <div>
            <dt className="text-muted">Versions</dt>
            <dd className="text-paper">{incident.versions.length ? incident.versions.join("; ") : "Not stated by the source."}</dd>
          </div>
          <div>
            <dt className="text-muted">Sectors</dt>
            <dd className="text-paper">{incident.sectors.length ? `${incident.sectors.join(", ")}. Inferred from words in the source text, not assigned by the publisher.` : "Not stated by the source."}</dd>
          </div>
          <div>
            <dt className="text-muted">Regions</dt>
            <dd className="text-paper">{incident.regions.length ? incident.regions.join(", ") : "Not stated by the source."}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="threat-exploit">
        <h3 id="threat-exploit" className="font-serif text-xl">Severity and exploitation</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{incident.exploitation}</p>
      </section>

      <section aria-labelledby="threat-authority">
        <h3 id="threat-authority" className="font-serif text-xl">Official advisories</h3>
        {incident.authority.length ? (
          <ul className="mt-3 space-y-3">
            {incident.authority.map((action) => (
              <li key={`${action.source}-${action.text}`} className="rounded-md border border-line bg-ink-2 p-3 text-sm">
                <p className="text-xs uppercase tracking-[0.14em] text-brass">{action.source}</p>
                <p className="mt-2 leading-6 text-paper">{action.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">This record has no required-action text from the source. The sections below are general guidance.</p>
        )}
        <ul className="mt-3 space-y-1 text-sm">
          {incident.links.map((link) => (
            <li key={link.url}>
              <a className="text-brass underline" href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="threat-users">
        <h3 id="threat-users" className="font-serif text-xl">Advisory for users</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{incident.userAdvisory}</p>
      </section>

      <section aria-labelledby="threat-precautions">
        <h3 id="threat-precautions" className="font-serif text-xl">Precautions</h3>
        <ul className="mt-3 space-y-3">
          {incident.precautions.map((item) => (
            <li key={item.audience} className="rounded-md border border-line p-3 text-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">{AUDIENCE[item.audience]}</p>
              <p className="mt-2 leading-6 text-muted">{item.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="threat-sources">
        <h3 id="threat-sources" className="font-serif text-xl">Source records</h3>
        <ul className="mt-3 space-y-3">
          {incident.notes.map((note) => (
            <li key={`${note.source}-${note.url}`} className="text-sm">
              <p className="text-paper">{note.source} · <time dateTime={note.date}>{note.date}</time></p>
              <p className="mt-1 leading-6 text-muted">{note.summary}</p>
              <a className="mt-1 inline-block text-brass underline" href={note.url} target="_blank" rel="noreferrer">Source link</a>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
