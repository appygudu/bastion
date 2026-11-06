import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/scanner/analyze";
import { demoObservation } from "@/lib/scanner/fixture";
import { scanBudgetMs } from "@/lib/scanner/run";
import { scoreBand, scoreFindings } from "@/lib/scanner/score";

describe("passive analyzer", () => {
  const analysis = analyze(demoObservation());
  const ids = analysis.findings.map((finding) => finding.id);

  it("flags the demo fixture without storing secret bodies", () => {
    expect(ids).toEqual(expect.arrayContaining([
      "hdr-csp",
      "hdr-hsts",
      "hdr-frame",
      "cookie-flags",
      "cors-wildcard",
      "mixed-content",
      "path-env",
      "path-git-HEAD",
      "robots-ai",
    ]));
    const env = analysis.findings.find((finding) => finding.id === "path-env");
    expect(env?.severity).toBe("critical");
    expect(env?.evidence).not.toMatch(/API_KEY|SECRET|password=/i);
    expect(env?.fix).toContain("nginx");
    expect(analysis.findings.find((finding) => finding.id === "hdr-hsts")?.fix).toContain("max-age=63072000");
  });

  it("scores the fixture as exposed and records controls that did hold", () => {
    const score = scoreFindings(analysis.findings);
    expect(score).toBe(29);
    expect(scoreBand(score)).toBe("Exposed");
    expect(analysis.passes.map((pass) => pass.id)).toEqual(expect.arrayContaining(["tls-verified", "tls-modern"]));
  });

  it("keeps the scan budget under the 60 second serverless limit", () => {
    expect(scanBudgetMs()).toBeGreaterThanOrEqual(1_000);
    expect(scanBudgetMs()).toBeLessThanOrEqual(55_000);
  });
});
