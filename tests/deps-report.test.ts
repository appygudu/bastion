import { describe, expect, it } from "vitest";
import { parseManifest } from "@/lib/deps/parse";
import { buildReport } from "@/lib/reports/model";
import { renderReportPdf } from "@/lib/reports/pdf";
import { rateLimit, resetRateLimits } from "@/lib/security/rate-limit";

describe("dependency manifests", () => {
  it("parses exact, ranged, and unpinned packages", () => {
    const npm = parseManifest(
      JSON.stringify({ dependencies: { lodash: "4.17.20", express: "^4.18.2" }, devDependencies: { typescript: "latest" } }),
      "package.json",
    );
    expect(npm.find((pkg) => pkg.name === "lodash")).toMatchObject({ version: "4.17.20", exact: true, ecosystem: "npm" });
    expect(npm.find((pkg) => pkg.name === "express")).toMatchObject({ version: "4.18.2", exact: false });
    expect(npm.find((pkg) => pkg.name === "typescript")?.version).toBeNull();
    const py = parseManifest("Django==4.2.1\nrequests>=2.0\n# comment\nflask\n", "requirements.txt");
    expect(py.find((pkg) => pkg.name === "Django")).toMatchObject({ version: "4.2.1", ecosystem: "PyPI" });
    expect(py.find((pkg) => pkg.name === "requests")?.version).toBeNull();
    expect(py.find((pkg) => pkg.name === "flask")?.version).toBeNull();
  });
});

describe("reports and rate limits", () => {
  it("lowers the executive score when agent findings and vulns are present", () => {
    const report = buildReport({
      orgName: "Northwind Labs",
      demo: true,
      scanScore: 80,
      findings: [],
      passes: [],
      ledger: { events: 3, agents: [], anomalies: 2, chainValid: true },
      agents: { events: 1, findings: 2 },
      dependencies: { packages: 4, vulnerable: 2, live: true },
    });
    expect(report.score).toBe(80 - 8 - 4 - 6);
    expect(report.limitations[0]).toMatch(/not a certification/i);
    expect(report.demo).toBe(true);
  });

  it("writes a PDF header", async () => {
    const report = buildReport({
      orgName: "Northwind Labs",
      demo: true,
      scanScore: 80,
      findings: [],
      passes: [],
      ledger: { events: 0, agents: [], anomalies: 0, chainValid: true },
      agents: { events: 0, findings: 0 },
      dependencies: { packages: 0, vulnerable: 0, live: false },
    });
    const pdf = await renderReportPdf(report);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("rate limits a key inside the window", () => {
    resetRateLimits();
    expect(rateLimit("scan:test", 2, 60_000, 1_000).ok).toBe(true);
    expect(rateLimit("scan:test", 2, 60_000, 1_100).ok).toBe(true);
    const blocked = rateLimit("scan:test", 2, 60_000, 1_200);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
