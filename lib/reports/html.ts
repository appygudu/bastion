import type { ReportModel } from "./model";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderReportHtml(model: ReportModel): string {
  const findings = model.findings
    .map(
      (finding) => `<article class="finding">
        <header><span class="sev ${esc(finding.severity)}">${esc(finding.severity)}</span><h3>${esc(finding.title)}</h3></header>
        <p>${esc(finding.evidence)}</p>
        <p class="meta">${esc(finding.owasp.join(" · "))} · ${esc(finding.nistCsf.join(", "))}</p>
        <pre>${esc(finding.fix)}</pre>
      </article>`,
    )
    .join("");
  const roadmap = model.roadmap
    .map((item) => `<section><h3>${esc(item.horizon)}</h3><ul>${item.items.map((line) => `<li>${esc(line)}</li>`).join("")}</ul></section>`)
    .join("");
  const frameworks = model.frameworks
    .map((item) => `<dt>${esc(item.name)}</dt><dd>${esc(item.how)}</dd>`)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(model.title)}</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; background: #f4f0e6; color: #1c1915; font: 15px/1.5 "IBM Plex Sans", "Segoe UI", sans-serif; }
    main { max-width: 880px; margin: 0 auto; padding: 48px 28px 80px; }
    h1 { font-family: "Iowan Old Style", Palatino, serif; font-weight: 500; font-size: 40px; margin: 0 0 8px; }
    h2 { font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; margin: 36px 0 12px; }
    .kicker { letter-spacing: 0.16em; text-transform: uppercase; font-size: 12px; color: #6e6456; }
    .score { display: flex; gap: 18px; align-items: baseline; margin: 18px 0; }
    .score b { font-family: "Iowan Old Style", Palatino, serif; font-size: 72px; font-weight: 500; line-height: 0.9; }
    .banner { border: 1px solid #c6a36a; background: #fff8ea; padding: 10px 12px; }
    .finding { border-top: 1px solid #d9d1c3; padding: 14px 0; }
    .finding h3 { display: inline; font-size: 16px; margin-left: 8px; }
    .sev { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 6px; border: 1px solid currentColor; }
    .critical { color: #8d2f24; } .high { color: #8a4b12; } .medium { color: #6e5520; } .low, .info { color: #3f4d44; }
    pre { white-space: pre-wrap; background: #fff; border: 1px solid #e4dccb; padding: 10px; font-size: 12px; }
    dt { font-weight: 600; margin-top: 10px; } dd { margin: 0; }
    ul { padding-left: 18px; }
    @media print { body { background: white; } main { padding: 0; } }
  </style>
</head>
<body>
  <main>
    <p class="kicker">Bastion · Executive posture brief · ${esc(model.generatedAt)}</p>
    <h1>${esc(model.title)}</h1>
    ${model.demo ? `<p class="banner">Demo fixture. Northwind Labs data was seeded for evaluation and was not collected from a live customer.</p>` : ""}
    <div class="score"><b>${model.score}</b><div><div>${esc(model.band)}</div><div>Posture index, not a certification</div></div></div>
    <p>${esc(model.narrative)}</p>
    <h2>Remediation roadmap</h2>
    ${roadmap}
    <h2>Findings</h2>
    ${findings || "<p>No web findings were available.</p>"}
    <h2>Observed controls</h2>
    <ul>${model.passes.map((pass) => `<li><strong>${esc(pass.title)}</strong> — ${esc(pass.evidence)}</li>`).join("") || "<li>None recorded.</li>"}</ul>
    <h2>Ledger and agents</h2>
    <p>${model.ledger.events} traffic events. Hash chain ${model.ledger.chainValid ? "verified" : "failed verification"}. ${model.ledger.anomalies} anomaly flags. Top agents: ${esc(model.ledger.agents.map((agent) => `${agent.name} (${agent.count})`).join(", ") || "none")}.</p>
    <p>${model.agents.events} agent tool-call events, ${model.agents.findings} guardrail findings. Dependency review covered ${model.dependencies.packages} packages, ${model.dependencies.vulnerable} with at least one OSV record${model.dependencies.live ? "" : " (no live OSV review in this brief)"}.</p>
    <h2>Framework mapping</h2>
    <dl>${frameworks}</dl>
    <h2>Limitations</h2>
    <ul>${model.limitations.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
    <p class="kicker">© 2026 Flyhigh. Defensive use only. Prepared for the organization that owns the assessed assets.</p>
  </main>
</body>
</html>`;
}
