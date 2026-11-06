import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { analyze } from "@/lib/scanner/analyze";
import { demoObservation } from "@/lib/scanner/fixture";
import { scoreBand, scoreFindings } from "@/lib/scanner/score";

const sample = analyze(demoObservation());
const score = scoreFindings(sample.findings);
const highlights = sample.findings.filter((finding) => finding.severity === "critical" || finding.severity === "high").slice(0, 4);

const features = [
  ["Passive scanner", "Headers, TLS, cookies, CORS, mixed content, robots/ai.txt, and well-known sensitive paths. Read-only. Every finding ships with a header or server snippet."],
  ["Dependency review", "Paste a package.json or requirements.txt. Bastion asks OSV.dev what it knows and shows the record it returned. Unpinned versions are called out, not guessed."],
  ["Bot and agent ledger", "An Express middleware, a small browser snippet, and an HTTP ingest. Known AI crawlers are classified from their published user-agent tokens."],
  ["Allow and deny policy", "Decide per agent, then export robots.txt, an ai.txt draft, and middleware that enforces the same decision on a host you operate."],
  ["Agent guardrail log", "Record tool calls by prompt hash. Indicator rules flag instruction override, secret-shaped strings, and high-impact tools, mapped to the OWASP LLM Top 10."],
  ["Executive brief", "One index, a remediation roadmap, and the framework mapping. HTML for the board pack, PDF for the archive. The limitations are printed on the brief."],
];

const steps = [
  ["Attest", "You confirm the host is yours. Bastion refuses private, loopback, and metadata addresses before it connects."],
  ["Observe", "A handful of HEAD and GET requests. No exploit payloads, no login attempts, no writes."],
  ["Ledger", "Your application reports the requests it actually received. The log is hash-chained so a quiet edit shows up."],
  ["Brief", "Security and the executive team read the same score, with the fixes still attached."],
];

const faqs = [
  ["Is this a penetration test?", "No. Bastion does not exploit a finding, spray passwords, or send data-modifying payloads. A passing score is not a statement that the application is safe."],
  ["Can I point it at a vendor?", "Only if you are authorized to assess that host, and you have to say so. The scanner still refuses internal ranges, cloud metadata, and non-web ports."],
  ["Does robots.txt stop a crawler?", "No. It is a preference. Cloudflare documents the same limit. The middleware export is what actually returns 403 on a process you run."],
  ["Can the ledger be rewritten?", "The hash chain detects a changed row. Someone who can rewrite every row and the hashes can rebuild it. Export the JSON to storage your application admins do not control."],
  ["Do you store prompts?", "The guardrail API hashes the prompt and stores the findings. The prompt text is discarded. Matched secrets are not copied into the finding."],
];

const tour = [
  {
    kicker: "Overview",
    title: "A score a director can read",
    body: "The workspace opens on the latest heuristic, a severity mix, a trend of completed scans, and the critical and high findings to fix first.",
  },
  {
    kicker: "Scanner",
    title: "Evidence, then a pasteable fix",
    body: "Each finding names the header or path, the OWASP and NIST labels, and nginx, Apache, and Express snippets. Filter by severity and copy the fix.",
  },
  {
    kicker: "Ledger",
    title: "Every crawler, on a hash chain",
    body: "Known AI user-agents are classified. Anomalies are flagged. The chain is verified across every stored row, and the page exports JSON or CSV.",
  },
  {
    kicker: "Agent log",
    title: "Tool calls without the prompt",
    body: "Instruction override, secret-shaped strings, and high-impact tools are indicators mapped to the OWASP LLM Top 10. The prompt text is discarded.",
  },
];

export default function HomePage() {
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <main id="content">
        <section className="mx-auto grid max-w-6xl items-end gap-10 px-4 py-16 sm:px-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Defensive control plane</p>
            <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.05] text-paper sm:text-6xl">
              See the bots. Close the doors they can open.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted">
              Bastion gives a security team a passive read of the sites they own, a ledger of the AI crawlers and agents that touch them, and a brief an executive can read without a translator.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-sm bg-brass px-4 py-3 text-sm font-medium text-on-accent">Try the live demo</Link>
              <Link href="/exposure" className="rounded-sm border border-line px-4 py-3 text-sm">Check if you&apos;re affected</Link>
              <Link href="/threats" className="rounded-sm border border-line px-4 py-3 text-sm">Global attacks</Link>
              <Link href="#tour" className="rounded-sm border border-line px-4 py-3 text-sm">Product tour</Link>
              <Link href="/signup" className="rounded-sm px-4 py-3 text-sm text-muted hover:text-paper">Create a workspace</Link>
            </div>
          </div>
          <aside className="rounded-md border border-line bg-ink-2/90 p-5 shadow-[var(--shadow)]">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Illustrative fixture · not a live scan</p>
            <p className="mt-4 font-serif text-6xl leading-none">{score}</p>
            <p className="mt-1 text-brass">{scoreBand(score)} · Northwind storefront</p>
            <ul className="mt-5 space-y-3 text-sm">
              {highlights.map((finding) => (
                <li key={finding.id} className="border-t border-line pt-3">
                  <span className={`text-[11px] uppercase tracking-wider sev-${finding.severity}`}>{finding.severity}</span>
                  <p className="mt-1">{finding.title}</p>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className="border-y border-line bg-ink-2/60">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-5 md:grid-cols-3">
            {[
              ["Own assets only", "The scan button stays disabled until someone attests ownership. The server checks it again."],
              ["Evidence, then a fix", "A finding names the header or path and gives nginx, Apache, and Express you can paste."],
              ["One record for the audit", "Traffic and tool calls share a tamper-evident chain and export to CSV or JSON."],
            ].map(([title, body]) => (
              <div key={title}>
                <h2 className="font-serif text-2xl">{title}</h2>
                <p className="mt-3 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-5 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Exposure check</p>
            <h2 className="mt-3 font-serif text-4xl">Check if you&apos;re affected.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
              Look up breach names for an email or a domain, test a password without sending it to Bastion, and read recent advisories from CISA and OSV. The page shows data classes and dates. It does not show leaked values, and a clean result is not proof of safety.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/exposure" className="inline-block rounded-sm bg-brass px-4 py-3 text-sm font-medium text-on-accent">Open the exposure check</Link>
              <Link href="/threats" className="inline-block rounded-sm border border-line px-4 py-3 text-sm">Global attacks</Link>
            </div>
          </div>
          <ul className="space-y-3 text-sm text-muted">
            <li className="rounded-md border border-line bg-ink-2 p-4">Email and domain names come from the public XposedOrNot catalog. Have I Been Pwned is used only when an API key is configured.</li>
            <li className="rounded-md border border-line bg-ink-2 p-4">The password check runs in the browser. Only five characters of a SHA-1 hash go to Pwned Passwords.</li>
            <li className="rounded-md border border-line bg-ink-2 p-4">Passive host hints stay behind the same ownership attestation and address refusals as the workspace scanner.</li>
          </ul>
        </section>

        <section className="border-y border-line bg-ink-2/40">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-5 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Global attacks</p>
              <h2 className="mt-3 font-serif text-4xl">What the public feeds published.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
                Titles, dates, and source links from CISA, NCSC UK, ENISA, NVD, GitHub, Cisco, and Microsoft. CERT-In is requested and listed as unavailable when that site does not return a feed. No incident on this page is written in by hand.
              </p>
              <Link href="/threats" className="mt-6 inline-block rounded-sm bg-brass px-4 py-3 text-sm font-medium text-on-accent">Open global attacks</Link>
            </div>
            <ul className="space-y-3 text-sm text-muted">
              <li className="rounded-md border border-line bg-ink-2 p-4">Each record shows what the source said, which products and versions it named, and whether that source marked it exploited.</li>
              <li className="rounded-md border border-line bg-ink-2 p-4">A required action copied from CISA or NVD is labelled as that authority&apos;s text. Other advice says it is general guidance.</li>
              <li className="rounded-md border border-line bg-ink-2 p-4">Filter by time, severity, sector, AI keywords, or exploited-in-the-wild, then export the rows you are looking at.</li>
            </ul>
          </div>
        </section>

        <section id="tour" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Product tour</p>
          <h2 className="mt-3 max-w-2xl font-serif text-4xl">The screens a review actually uses.</h2>
          <p className="mt-4 max-w-2xl text-sm text-muted">
            The panels below describe the workspace. The numbers on this page come from the Northwind fixture, labelled demo, and are not a scan of a customer.
          </p>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {tour.map((panel) => (
              <article key={panel.kicker} className="rounded-md border border-line bg-ink-2 p-5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-brass">{panel.kicker}</p>
                <h3 className="mt-2 font-serif text-2xl">{panel.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{panel.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-md border border-line bg-ink">
            <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs text-muted">
              <span>Northwind Labs · overview</span>
              <span>Illustrative</span>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-[180px_1fr]">
              <div>
                <p className="font-serif text-5xl leading-none">{score}</p>
                <p className="mt-1 text-sm text-brass">{scoreBand(score)}</p>
              </div>
              <ol className="space-y-2 text-sm">
                {highlights.map((finding, index) => (
                  <li key={finding.id} className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
                    <span><span className="text-muted">{index + 1}.</span> {finding.title}</span>
                    <span className={`text-[11px] uppercase sev-${finding.severity}`}>{finding.severity}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <Link href="/login" className="mt-6 inline-block text-sm text-brass underline">Try the live demo</Link>
        </section>

        <section id="trust" className="border-y border-line">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Trust and security</p>
              <h2 className="mt-3 font-serif text-4xl">Built to refuse the scan you should not run.</h2>
              <p className="mt-4 text-sm leading-6 text-muted">
                Bastion is a defensive product. The controls below are enforced in the server, not only described on this page.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                ["SSRF refusal", "Private, loopback, link-local, and cloud metadata addresses are blocked before a connection. DNS is checked, and the socket is pinned to a public address."],
                ["Ownership gate", "The scan stays disabled until someone attests the host. The API rejects the request if that attestation is missing."],
                ["Tamper-evident ledger", "Each traffic row and each agent event extends a SHA-256 chain. The ledger page verifies the full chain, not only the rows on screen."],
                ["Prompts stay out", "Guardrail events store a hash and the indicator. The prompt text and any matched secret are not written to the finding."],
              ].map(([title, body]) => (
                <li key={title} className="rounded-md border border-line bg-ink-2 p-4">
                  <h3 className="font-serif text-xl">{title}</h3>
                  <p className="mt-2 text-sm text-muted">{body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 pb-12 text-sm sm:px-5">
            <Link href="/security" className="text-brass underline">Security notes</Link>
            <Link href="/pitch" className="text-brass underline">Readiness</Link>
            <Link href="/acceptable-use" className="text-brass underline">Acceptable use</Link>
            <Link href="/docs" className="text-brass underline">Product docs</Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">What the workspace holds</p>
          <div className="mt-8 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, body], index) => (
              <article key={title} className="bg-ink p-6">
                <p className="font-mono text-xs text-brass">0{index + 1}</p>
                <h2 className="mt-3 font-serif text-2xl">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl border-t border-line px-4 py-16 sm:px-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">How a review runs</p>
          <ol className="mt-8 grid gap-6 md:grid-cols-4">
            {steps.map(([title, body], index) => (
              <li key={title}>
                <p className="font-mono text-xs text-brass">{index + 1}</p>
                <h2 className="mt-2 font-serif text-2xl">{title}</h2>
                <p className="mt-2 text-sm text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl border-t border-line px-4 py-16 sm:px-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Framework mapping</p>
          <p className="mt-4 max-w-3xl text-sm text-muted">
            Bastion is not certified against these documents, and this table is not an attestation. The labels point at outcomes a team might map a control to. Sources are cited in the research notes. There are no customer logos and no uptime or compliance numbers on this page.
          </p>
          <div className="mt-8 overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-ink-2 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Control</th>
                  <th className="px-4 py-3 font-medium">Primary mapping</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Header, TLS, cookie, CORS review", "OWASP 2025 A02 / A04 · NIST CSF PR.PS, PR.DS"],
                  ["Sensitive-path presence check", "OWASP 2025 A02 · A01 · ISO 27001 A.8.15 evidence of exposure"],
                  ["OSV dependency review", "OWASP 2025 A03 Software Supply Chain Failures · NIST CSF GV.SC, PR.PS-02"],
                  ["Bot ledger and anomaly flags", "OWASP 2025 A09 · NIST CSF DE.CM, DE.AE · SOC 2 CC7.2"],
                  ["Agent tool-call indicators", "OWASP LLM Top 10 2025 · NIST AI RMF MEASURE / MANAGE · MITRE ATLAS AML.T0051"],
                  ["Executive brief", "NIST CSF GV.OV · a communication aid, not an audit opinion"],
                ].map(([control, mapping]) => (
                  <tr key={control} className="border-t border-line">
                    <td className="px-4 py-3">{control}</td>
                    <td className="px-4 py-3 text-muted">{mapping}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-6xl border-t border-line px-4 py-16 sm:px-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Questions worth asking</p>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group py-4">
                <summary className="cursor-pointer list-none font-serif text-2xl marker:content-none">{question}</summary>
                <p className="mt-3 max-w-3xl text-sm text-muted">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5">
          <div className="rounded-md border border-line bg-ink-2 p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Responsible use</p>
            <h2 className="mt-3 font-serif text-3xl">Defensive use, on systems you operate.</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
              Bastion is not an attack tool. Do not scan hosts you do not own or have written authority to assess. Do not use the ledger to watch people in secret. Embed it on properties you operate, and say so in your privacy notice. The full policy is in Acceptable Use and SECURITY.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-sm bg-brass px-4 py-3 text-sm font-medium text-on-accent">Try the live demo</Link>
              <Link href="/acceptable-use" className="rounded-sm border border-line px-4 py-3 text-sm">Acceptable use</Link>
            </div>
          </div>
        </section>
      </main>
      </div>
  );
}
