import { describe, expect, it } from "vitest";
import { countInRange, looksLikePwnedRange, rangePrefixFromBody, sha1HexSync } from "@/lib/exposure/password";
import { spreadsheetCell } from "@/lib/csv";
import { enterpriseContact, paymentLink } from "@/lib/public-env";
import { sameAssessedUrl, weeklyNext } from "@/lib/scans/schedule";
import { sameOrigin } from "@/lib/security/origin";
import { securityTxt } from "@/lib/security/security-txt";
import { incidentsToCsv } from "@/lib/threats/model";
import { incidentsFromKev } from "@/lib/threats/parse";

describe("password range", () => {
  it("hashes locally and accepts only a 5-character prefix", () => {
    expect(sha1HexSync("password")).toBe("5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8");
    expect(rangePrefixFromBody({ prefix: "5baa6" })).toBe("5BAA6");
    expect(rangePrefixFromBody({ prefix: "5baa6", password: "password" })).toBeNull();
    expect(rangePrefixFromBody({ prefix: "5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8" })).toBeNull();
    expect(rangePrefixFromBody({ hash: "5BAA6" })).toBeNull();
  });

  it("counts a padded range line without treating a zero pad as a hit", () => {
    const body = "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0";
    expect(countInRange(body, "1E4C9B93F3F0682250B6CF8331B7EE68FD8")).toBe(3);
    expect(countInRange(body, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")).toBe(0);
    expect(looksLikePwnedRange(body)).toBe(true);
    expect(looksLikePwnedRange("<html>blocked</html>")).toBe(false);
  });
});

describe("readiness helpers", () => {
  it("accepts an enterprise email or https URL and rejects the rest", () => {
    const previous = process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT;
    process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT = "";
    expect(enterpriseContact()).toBeNull();
    process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT = "ops@example.com";
    expect(enterpriseContact()).toEqual({ kind: "email", value: "ops@example.com" });
    process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT = "http://example.com/contact";
    expect(enterpriseContact()).toBeNull();
    process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT = "https://user:pass@example.com/contact";
    expect(enterpriseContact()).toBeNull();
    process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT = "https://example.com/contact";
    expect(enterpriseContact()?.kind).toBe("url");
    process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT = previous;
    expect(spreadsheetCell("=cmd")).toBe(`"'=cmd"`);
  });
});

describe("security.txt", () => {
  it("publishes a contact URL and does not invent an email", () => {
    const now = new Date("2026-10-23T00:00:00.000Z");
    const body = securityTxt("https://bastion.example", null, now);
    expect(body).toContain("Contact: https://bastion.example/security");
    expect(body).not.toContain("mailto:");
    expect(body).toContain("Canonical: https://bastion.example/.well-known/security.txt");
    expect(body).toContain(`Expires: ${new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()}`);
    const withMail = securityTxt("https://bastion.example", "security@example.com", new Date("2026-10-23T00:00:00.000Z"));
    expect(withMail).toContain("Contact: mailto:security@example.com");
  });
});

describe("request guards", () => {
  it("allows a missing origin and rejects a different host", () => {
    expect(sameOrigin(new Request("https://bastion.example/api", { headers: { host: "bastion.example" } }))).toBe(true);
    expect(sameOrigin(new Request("https://bastion.example/api", { headers: { host: "bastion.example", origin: "https://evil.example" } }))).toBe(false);
    expect(sameOrigin(new Request("https://bastion.example/api", { headers: { host: "bastion.example", origin: "https://bastion.example" } }))).toBe(true);
  });

  it("schedules only a URL this workspace already assessed", () => {
    expect(sameAssessedUrl("https://app.example/health", ["https://app.example/health"])).toBe(true);
    expect(sameAssessedUrl("https://other.example/health", ["https://app.example/health"])).toBe(false);
    expect(sameAssessedUrl("https://user:pass@app.example/health", ["https://app.example/health"])).toBe(false);
    expect(weeklyNext(Date.parse("2026-10-23T00:00:00Z")).toISOString()).toBe("2026-10-30T00:00:00.000Z");
  });

  it("does not treat an unset payment link as a URL", () => {
    const previous = process.env.NEXT_PUBLIC_PAYMENT_LINK_URL;
    delete process.env.NEXT_PUBLIC_PAYMENT_LINK_URL;
    expect(paymentLink()).toBeNull();
    process.env.NEXT_PUBLIC_PAYMENT_LINK_URL = "http://example.com/pay";
    expect(paymentLink()).toBeNull();
    process.env.NEXT_PUBLIC_PAYMENT_LINK_URL = "https://buy.stripe.com/test";
    expect(paymentLink()).toBe("https://buy.stripe.com/test");
    if (previous === undefined) delete process.env.NEXT_PUBLIC_PAYMENT_LINK_URL;
    else process.env.NEXT_PUBLIC_PAYMENT_LINK_URL = previous;
  });
});

describe("export safety", () => {
  it("prefixes a spreadsheet formula in CSV", () => {
    const [item] = incidentsFromKev({
      vulnerabilities: [{
        cveID: "CVE-2026-106931",
        vendorProject: "Example",
        product: "Gateway",
        vulnerabilityName: "Example",
        dateAdded: "2026-10-20",
        shortDescription: "Example.",
        requiredAction: "Apply the vendor update.",
        knownRansomwareCampaignUse: "Unknown",
      }],
    });
    const csv = incidentsToCsv([{ ...item, title: "=cmd()" }]);
    expect(csv).toContain(`"'=cmd()"`);
  });
});
