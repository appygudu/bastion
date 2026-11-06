import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ENTERPRISE_ACTIONS, PERSONAL_ACTIONS } from "@/lib/exposure/actions";
import { advisoriesFromKev, advisoriesFromOsv, isAiRelated, loadAdvisories, normalizePackage, resetAdvisoryCache } from "@/lib/exposure/advisories";
import { breachesFromCatalog, normalizeDomain, passiveScanPermitted, scanHints } from "@/lib/exposure/domain";
import { breachesFromAnalytics, breachesFromHibp, normalizeEmail } from "@/lib/exposure/email";
import { countInRange, pwnedRangeParts, pwnedRangeUrl, strengthTips } from "@/lib/exposure/password";
import { exposureRateKey, redactText } from "@/lib/exposure/privacy";
import type { Finding } from "@/lib/types";

describe("exposure privacy", () => {
  it("hashes the email into the rate-limit key", () => {
    const key = exposureRateKey("email-target", "Person@Example.com");
    expect(key).toMatch(/^exposure:email-target:[a-f0-9]{64}$/);
    expect(key).not.toContain("person@example.com");
    expect(key).not.toContain("Person@Example.com");
  });

  it("redacts addresses that appear in free text", () => {
    expect(redactText("see person@example.com now")).toBe("see [redacted] now");
  });

  it("does not publish a password route", () => {
    expect(readdirSync("app/api/exposure")).not.toContain("password");
  });
});

describe("email and domain parsing", () => {
  it("keeps breach metadata and drops the address, pastes, and narrative", () => {
    const breaches = breachesFromAnalytics({
      email: "person@example.com",
      ExposedPastes: { pastes: [{ body: "hunter2 person@example.com" }] },
      ExposedBreaches: {
        breaches_details: [
          {
            breach: "Example Forum",
            details: "Leaked person@example.com password hunter2",
            domain: "example.com",
            xposed_data: "Email addresses;Passwords",
            xposed_date: "2024",
            xposed_records: 10,
            password_risk: "plaintext",
            references: "https://example.com/notice",
          },
        ],
      },
    });
    const encoded = JSON.stringify(breaches);
    expect(encoded).not.toContain("person@example.com");
    expect(encoded).not.toContain("hunter2");
    expect(breaches[0]).toMatchObject({
      name: "Example Forum",
      date: "2024",
      dataClasses: ["Email addresses", "Passwords"],
      passwordStorage: "Weak or reversible password storage",
      source: "XposedOrNot",
      sourceUrl: "https://example.com/notice",
    });
  });

  it("reads Have I Been Pwned classes without the description", () => {
    const breaches = breachesFromHibp([
      {
        Title: "Example",
        Name: "Example",
        Domain: "example.com",
        BreachDate: "2020-05-01",
        DataClasses: ["Email addresses"],
        Description: "Contains person@example.com and hunter2",
        PwnCount: 4,
      },
    ]);
    expect(JSON.stringify(breaches)).not.toContain("hunter2");
    expect(breaches[0].date).toBe("2020-05-01");
    expect(breaches[0].dataClasses).toEqual(["Email addresses"]);
  });

  it("rejects addresses and domains that are not a single public name", () => {
    expect(normalizeEmail("person@example.com")).toBe("person@example.com");
    expect(normalizeEmail("not an email")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
    expect(normalizeDomain("Example.com")).toBe("example.com");
    expect(normalizeDomain("https://example.com/path")).toBeNull();
    expect(normalizeDomain("127.0.0.1")).toBeNull();
    expect(normalizeDomain("localhost")).toBeNull();
    expect(normalizeDomain("metadata.google.internal")).toBeNull();
    expect(normalizeDomain("app.internal")).toBeNull();
  });

  it("reads catalog breaches without the narrative", () => {
    const breaches = breachesFromCatalog({
      exposedBreaches: [
        {
          breachID: "Twitter",
          breachedDate: "2022-01-01T00:00:00+00:00",
          domain: "twitter.com",
          exposedData: ["Email addresses", "Usernames"],
          exposedRecords: 12,
          exposureDescription: "sample person@example.com hunter2",
          referenceURL: "https://example.com/ref",
        },
      ],
    });
    expect(JSON.stringify(breaches)).not.toContain("hunter2");
    expect(breaches[0].date).toBe("2022-01-01");
    expect(breaches[0].dataClasses).toEqual(["Email addresses", "Usernames"]);
  });

  it("requires attestation before a passive hint", () => {
    expect(passiveScanPermitted(false, false)).toBe(true);
    expect(passiveScanPermitted(true, false)).toBe(false);
    expect(passiveScanPermitted(true, true)).toBe(true);
  });

  it("keeps hint text short", () => {
    const finding = {
      id: "hdr-csp",
      title: "Content-Security-Policy is missing",
      severity: "high",
      category: "headers",
      owasp: [],
      nistCsf: [],
      evidence: "x".repeat(400),
      fix: "nginx snippet that should stay off the public hint",
    } satisfies Finding;
    const hints = scanHints([finding]);
    expect(hints[0].evidence.length).toBe(240);
    expect(JSON.stringify(hints)).not.toContain("nginx");
  });
});

describe("password k-anonymity", () => {
  it("sends only a 5 character prefix", () => {
    const hash = "ABCDEF0123456789ABCDEF0123456789ABCDEF01";
    const parts = pwnedRangeParts(hash);
    const url = pwnedRangeUrl(parts.prefix);
    expect(parts.prefix).toHaveLength(5);
    expect(url).toBe("https://api.pwnedpasswords.com/range/ABCDE");
    expect(url).not.toContain(parts.suffix);
    expect(countInRange(`ABCDEF0123456789ABCDEF0123456789ABCDEF01:12\nFFFF:1`, parts.suffix)).toBe(0);
    expect(countInRange(`${parts.suffix}:4\n00000:1`, parts.suffix)).toBe(4);
  });

  it("gives strength tips without echoing the password", () => {
    const tips = strengthTips("hunter2-secret", 3).join(" ");
    expect(tips).not.toContain("hunter2");
    expect(tips).toMatch(/Stop using it/);
  });
});

describe("advisory feeds", () => {
  it("keeps real catalog rows and skips incomplete ones", () => {
    const parsed = advisoriesFromKev({
      dateReleased: "2026-10-21T00:00:00Z",
      vulnerabilities: [
        {
          cveID: "CVE-2024-0001",
          dateAdded: "2024-02-01",
          vulnerabilityName: "Example bug",
          vendorProject: "Example",
          product: "Widget",
          shortDescription: "A widget bug.",
          knownRansomwareCampaignUse: "Unknown",
          requiredAction: "Apply the vendor update.",
          leakedSample: "hunter2",
        },
        {
          cveID: "CVE-2024-0002",
          dateAdded: "2024-03-01",
          vulnerabilityName: "LangChain agent bug",
          vendorProject: "LangChain",
          product: "LangChain",
          shortDescription: "An LLM agent tool bug.",
          knownRansomwareCampaignUse: "Known",
          requiredAction: "Apply the vendor update.",
        },
        { vulnerabilityName: "Missing id" },
      ],
    });
    expect(parsed.items).toHaveLength(2);
    expect(parsed.catalogReleased).toBe("2026-10-21T00:00:00Z");
    expect(parsed.items[0].id).toBe("CVE-2024-0002");
    expect(parsed.items[0].severity).toBe("critical");
    expect(parsed.items[0].aiRelated).toBe(true);
    expect(parsed.items[1].severity).toBe("high");
    expect(parsed.items[1].aiRelated).toBe(false);
    expect(JSON.stringify(parsed.items)).not.toContain("hunter2");
    expect(parsed.items[0].sourceUrl).toContain("CVE-2024-0002");
  });

  it("maps OSV records that include a published date", () => {
    const items = advisoriesFromOsv(
      {
        vulns: [
          {
            id: "GHSA-1111-2222-3333",
            published: "2024-05-01T00:00:00Z",
            summary: "Example advisory",
            database_specific: { severity: "HIGH" },
            references: [{ url: "https://github.com/advisories/GHSA-1111-2222-3333" }],
          },
          { id: "GHSA-NO-DATE", summary: "Skipped" },
        ],
      },
      { ecosystem: "PyPI", name: "langchain" },
    );
    expect(items).toHaveLength(1);
    expect(items[0].date).toBe("2024-05-01");
    expect(items[0].severity).toBe("high");
    expect(items[0].source).toContain("OSV.dev");
    expect(items[0].sourceUrl).toBe("https://github.com/advisories/GHSA-1111-2222-3333");
  });

  it("flags AI wording without treating every product as related", () => {
    expect(isAiRelated("LangChain LLM tool")).toBe(true);
    expect(isAiRelated("Windows print spooler")).toBe(false);
  });

  it("accepts ordinary package names", () => {
    expect(normalizePackage("npm", "@langchain/core")).toEqual({ ecosystem: "npm", name: "@langchain/core" });
    expect(normalizePackage("PyPI", "llama-index")).toEqual({ ecosystem: "PyPI", name: "llama-index" });
    expect(normalizePackage("npm", "../evil")).toBeNull();
    expect(normalizePackage("rubygems", "rails")).toBeNull();
  });

  it("loads a feed from the sources and falls back when both fail", async () => {
    resetAdvisoryCache();
    const feed = await loadAdvisories(async (input) => {
      const url = String(input);
      if (url.includes("known_exploited_vulnerabilities")) {
        return new Response(JSON.stringify({
          dateReleased: "2026-01-02T00:00:00Z",
          vulnerabilities: [
            {
              cveID: "CVE-2024-1000",
              dateAdded: "2024-01-02",
              vulnerabilityName: "Catalog bug",
              vendorProject: "Example",
              product: "Widget",
              shortDescription: "From the catalog.",
              knownRansomwareCampaignUse: "Unknown",
              requiredAction: "Patch.",
            },
          ],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ vulns: [] }), { status: 200 });
    });
    expect(feed.error).toBeNull();
    expect(feed.items.some((item) => item.id === "CVE-2024-1000")).toBe(true);
    expect(feed.updatedAt).toBeTruthy();

    resetAdvisoryCache();
    const failed = await loadAdvisories(async () => {
      throw new Error("offline");
    });
    expect(failed.items).toEqual([]);
    expect(failed.error).toMatch(/could not be loaded/);
  });
});

describe("action checklist", () => {
  it("covers the personal and security-team steps", () => {
    expect(PERSONAL_ACTIONS.map((item) => item.id)).toEqual(["rotate", "passkey", "keys", "oauth", "monitor"]);
    expect(ENTERPRISE_ACTIONS.map((item) => item.id)).toEqual(["rotate", "passkey", "keys", "oauth", "monitor"]);
    expect(ENTERPRISE_ACTIONS.find((item) => item.id === "keys")?.detail).toMatch(/agent/);
    expect(PERSONAL_ACTIONS.map((item) => item.detail).join(" ")).not.toBe(ENTERPRISE_ACTIONS.map((item) => item.detail).join(" "));
  });
});
