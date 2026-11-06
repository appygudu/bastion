import { beforeEach, describe, expect, it } from "vitest";
import { loadThreats, nvdWindowUrl, resetThreatCache } from "@/lib/threats/feed";
import { filterIncidents, incidentsToCsv, plainText } from "@/lib/threats/model";
import {
  incidentsFromEuvd,
  incidentsFromGhsa,
  incidentsFromKev,
  incidentsFromNvd,
  incidentsFromRss,
  mergeIncidents,
  rssEntries,
} from "@/lib/threats/parse";

const KEV = {
  catalogVersion: "test",
  vulnerabilities: [
    {
      cveID: "CVE-2026-106931",
      vendorProject: "Example",
      product: "Gateway",
      vulnerabilityName: "Example Gateway Command Injection",
      dateAdded: "2026-10-20",
      shortDescription: "Example Gateway is affected.",
      requiredAction: "Apply mitigations per vendor instructions or discontinue use.",
      dueDate: "2026-11-10",
      knownRansomwareCampaignUse: "Known",
      notes: "See https://www.cisa.gov/known-exploited-vulnerabilities-catalog and http://insecure.example/skip",
      cwes: ["CWE-78"],
      leakedPassword: "hunter2",
    },
    { cveID: "", dateAdded: "2026-10-20", vulnerabilityName: "Missing identifier" },
    {
      cveID: "CVE-2026-200001",
      vendorProject: "LangChain",
      product: "Server",
      vulnerabilityName: "LangChain Server Tool Bypass",
      dateAdded: "2026-10-18",
      shortDescription: "An AI agent tool can be called without review.",
      requiredAction: "Update the LangChain server.",
      knownRansomwareCampaignUse: "Unknown",
    },
  ],
};

describe("threat parsers", () => {
  it("keeps CISA required action, marks KEV exploited, and drops extra fields", () => {
    const items = incidentsFromKev(KEV);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: "CVE-2026-106931",
      date: "2026-10-20",
      severity: "critical",
      exploited: true,
      regions: [],
    });
    expect(items[0].authority[0].text).toBe("Apply mitigations per vendor instructions or discontinue use.");
    expect(items[0].userAdvisory.startsWith("General guidance, not the authority's words.")).toBe(true);
    expect(items[0].userAdvisory).not.toBe(items[0].authority[0].text);
    expect(items[0].products).toEqual(["Example", "Gateway"]);
    expect(items[0].links.some((link) => link.url.startsWith("https://www.cisa.gov/known-exploited-vulnerabilities-catalog"))).toBe(true);
    expect(items[0].links.some((link) => link.url.startsWith("http://"))).toBe(false);
    const encoded = JSON.stringify(items);
    expect(encoded).not.toContain("hunter2");
    expect(encoded).not.toContain("2026-11-10");
    expect(items[1].aiRelated).toBe(true);
    expect(items[1].precautions.some((item) => item.audience === "ai-systems")).toBe(true);
    expect(items[0].precautions.some((item) => item.audience === "ai-systems")).toBe(false);
    expect(items[0].exploitation).toContain("ransomware");
  });

  it("strips double-encoded RSS markup and skips entries without a date or https link", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item>
        <title>Vulnerabilities in PHP</title>
        <link>https://sec.cloudapps.cisco.com/security/center/content/CiscoSecurityAdvisory/cisco-sa-php-2026</link>
        <pubDate>Wed, 22 Oct 2026 00:00:00 GMT</pubDate>
        <description>&amp;lt;p&amp;gt;CVE-2026-109618 and CVE-2026-109619&amp;lt;/p&amp;gt;</description>
      </item>
      <item>
        <title>No date</title>
        <link>https://sec.cloudapps.cisco.com/security/center/content/CiscoSecurityAdvisory/missing</link>
        <description>skip</description>
      </item>
      <item>
        <title>Insecure link</title>
        <link>http://example.com/advisory</link>
        <pubDate>Wed, 22 Oct 2026 00:00:00 GMT</pubDate>
        <description>skip</description>
      </item>
    </channel></rss>`;
    expect(plainText("&amp;lt;p&amp;gt;Hello&amp;lt;/p&amp;gt;")).toBe("Hello");
    const entries = rssEntries(xml, 10);
    expect(entries).toHaveLength(1);
    expect(entries[0].summary).toBe("CVE-2026-109618 and CVE-2026-109619");
    expect(entries[0].summary).not.toContain("<");
    const [incident] = incidentsFromRss(entries, "Cisco Security Advisories", "cisco");
    expect(incident.id.startsWith("cisco-")).toBe(true);
    expect(incident.id).not.toContain(":");
    expect(incident.severity).toBe("unknown");
    expect(incident.exploited).toBe(false);
    expect(incident.regions).toEqual([]);
    expect(rssEntries("<html><title>Not a feed</title></html>", 5)).toEqual([]);
  });

  it("reads GitHub version ranges and skips withdrawn advisories", () => {
    const items = incidentsFromGhsa([
      {
        ghsa_id: "GHSA-558c-9hv2-4prj",
        cve_id: "CVE-2026-113721",
        html_url: "https://github.com/advisories/GHSA-558c-9hv2-4prj",
        summary: "virtualenv command injection",
        description: "A flaw in virtualenv.",
        severity: "medium",
        published_at: "2026-10-22T00:00:00Z",
        withdrawn_at: null,
        references: ["https://github.com/advisories/GHSA-558c-9hv2-4prj"],
        vulnerabilities: [
          { package: { ecosystem: "pip", name: "virtualenv" }, vulnerable_version_range: "< 21.14.9", first_patched_version: "21.14.9" },
        ],
      },
      {
        ghsa_id: "GHSA-object-patch",
        html_url: "https://github.com/advisories/GHSA-object-patch",
        summary: "Example package issue",
        description: "Example package issue.",
        severity: "moderate",
        published_at: "2026-10-21T00:00:00Z",
        vulnerabilities: [
          { package: { ecosystem: "npm", name: "example-pkg" }, vulnerable_version_range: "< 1.2.3", first_patched_version: { identifier: "1.2.3" } },
        ],
      },
      {
        ghsa_id: "GHSA-withdrawn",
        html_url: "https://github.com/advisories/GHSA-withdrawn",
        summary: "withdrawn",
        published_at: "2026-10-22T00:00:00Z",
        withdrawn_at: "2026-10-23T00:00:00Z",
      },
    ]);
    expect(items.map((item) => item.id)).toEqual(["CVE-2026-113721", "GHSA-object-patch"]);
    expect(items[0].products).toEqual(["pip:virtualenv"]);
    expect(items[0].versions).toEqual(["< 21.14.9", "patched 21.14.9"]);
    expect(items[1].severity).toBe("medium");
    expect(items[1].versions).toContain("patched 1.2.3");
    expect(JSON.stringify(items)).not.toContain("withdrawn");
  });

  it("maps an ENISA score and keeps the published references", () => {
    const items = incidentsFromEuvd([
      {
        id: "EUVD-2026-108208",
        description: "Example component allows remote code execution in hospitals.",
        datePublished: "Oct 22, 2026, 2:47:26 PM",
        baseScore: 8.4,
        baseScoreVersion: "4.0",
        references: "https://example.com/enisa https://example.com/vendor",
        enisaIdVendor: [{ vendor: { name: "Example Vendor" } }],
      },
      { id: "EUVD-missing", datePublished: "Oct 22, 2026, 2:47:26 PM" },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].date).toBe("2026-10-22");
    expect(items[0].severity).toBe("high");
    expect(items[0].products).toEqual(["Example Vendor"]);
    expect(items[0].sectors).toEqual(["Healthcare"]);
    expect(items[0].summary).toContain("ENISA base score 8.4");
    expect(items[0].links.map((link) => link.url)).toEqual(expect.arrayContaining(["https://example.com/enisa", "https://example.com/vendor"]));
    expect(items[0].regions).toEqual([]);
  });

  it("treats an NVD CISA exploit-add date as exploited and skips incomplete rows", () => {
    const items = incidentsFromNvd({
      vulnerabilities: [
        {
          cve: {
            id: "CVE-2026-103530",
            published: "2026-10-20T00:00:00.000",
            descriptions: [{ lang: "en", value: "A problem in Example Product." }, { lang: "es", value: "otra" }],
            metrics: { cvssMetricV31: [{ cvssData: { baseScore: 8.1, baseSeverity: "HIGH" } }] },
            cisaExploitAdd: "2026-10-21",
            cisaRequiredAction: "Apply updates per vendor instructions.",
            cisaVulnerabilityName: "Example Product Vulnerability",
            references: [{ url: "https://example.com/advisory" }],
            configurations: [{ nodes: [{ cpeMatch: [{ criteria: "cpe:2.3:a:example:widget:*:*:*:*:*:*:*:*", versionEndExcluding: "2.0.0" }] }] }],
          },
        },
        { cve: { id: "not-a-cve", published: "2026-10-20T00:00:00.000" } },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "CVE-2026-103530",
      title: "Example Product Vulnerability",
      exploited: true,
      severity: "high",
      regions: [],
    });
    expect(items[0].authority[0].text).toBe("Apply updates per vendor instructions.");
    expect(items[0].products).toContain("example widget");
    expect(items[0].versions).toContain("before 2.0.0");
    expect(items[0].exploitation).toContain("CISA exploit-add");
    expect(items[0].summary).not.toContain("otra");
  });

  it("merges records that share a CVE and unions their links", () => {
    const kev = incidentsFromKev(KEV)[0];
    const rss = incidentsFromRss(
      [{ title: "Vendor note", link: "https://example.com/vendor-note", date: "2026-10-19", summary: "CVE-2026-106931 is discussed." }],
      "Cisco Security Advisories",
      "cisco",
    )[0];
    const [merged] = mergeIncidents([[rss], [kev]]);
    expect(merged.id).toBe("CVE-2026-106931");
    expect(merged.exploited).toBe(true);
    expect(merged.severity).toBe("critical");
    expect(merged.date).toBe("2026-10-19");
    expect(merged.title).toContain("Example Gateway");
    expect(merged.links.map((link) => link.url)).toEqual(expect.arrayContaining([
      "https://example.com/vendor-note",
      kev.links[0].url,
    ]));
    expect(merged.notes).toHaveLength(2);
    expect(merged.authority[0].text).toBe(kev.authority[0].text);
    expect(merged.userAdvisory).toContain("General guidance, not the authority's words.");
    expect(merged.regions).toEqual([]);
  });
});

describe("threat filters and export", () => {
  it("filters by time, severity, exploited status, and search", () => {
    const items = incidentsFromKev(KEV);
    expect(filterIncidents(items, { rangeDays: 4 }, "2026-10-23").map((item) => item.id)).toEqual(["CVE-2026-106931"]);
    expect(filterIncidents(items, { severity: "critical" }).map((item) => item.id)).toEqual(["CVE-2026-106931"]);
    expect(filterIncidents(items, { exploited: true })).toHaveLength(2);
    expect(filterIncidents(items, { q: "langchain" }).map((item) => item.id)).toEqual(["CVE-2026-200001"]);
    expect(filterIncidents(items, { ai: true })).toHaveLength(1);
    expect(filterIncidents(items, { sector: "Healthcare" })).toHaveLength(0);
  });

  it("escapes quotes in CSV cells", () => {
    const [item] = incidentsFromKev(KEV);
    const csv = incidentsToCsv([{ ...item, title: 'Say "hello"' }]);
    expect(csv.split("\n")[0]).toBe("date,title,severity,exploited,products,versions,sectors,sources,urls");
    expect(csv).toContain('"Say ""hello"""');
  });
});

describe("threat feed loader", () => {
  beforeEach(() => resetThreatCache());

  it("builds an NVD window without an API key", () => {
    const url = nvdWindowUrl(Date.parse("2026-10-23T00:00:00Z"));
    expect(url).toContain("https://services.nvd.nist.gov/rest/json/cves/2.0?");
    expect(url).toContain("resultsPerPage=10");
    expect(url).toContain("pubStartDate=");
    expect(url).not.toContain("apiKey");
  });

  it("returns source records and a failed CERT-In status without inventing an item", async () => {
    resetThreatCache();
    const calls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("known_exploited_vulnerabilities.json")) return jsonResponse(KEV);
      if (url.includes("cert-in.org.in")) return new Response("<html><title>CERT-In</title><p>not a feed</p></html>", { status: 200 });
      if (url.includes("report-rss-feed.xml")) {
        return new Response(`<rss><channel><item><title>NCSC note</title><link>https://www.ncsc.gov.uk/report/example</link><pubDate>Wed, 07 May 2025 00:00:00 GMT</pubDate><description>A report.</description></item></channel></rss>`, { status: 200 });
      }
      return new Response("no", { status: 404 });
    }) as typeof fetch;
    const feed = await loadThreats(fetchImpl, 1_700_000_000_000);
    expect(feed.error).toBeNull();
    expect(feed.items.some((item) => item.id === "CVE-2026-106931")).toBe(true);
    expect(feed.items.some((item) => item.notes.some((note) => note.source === "NCSC UK reports"))).toBe(true);
    const cert = feed.sources.find((source) => source.id === "cert-in");
    expect(cert).toMatchObject({ ok: false, count: 0 });
    expect(cert?.error).toContain("did not return a feed");
    expect(JSON.stringify(feed.items)).not.toContain("cert-in.org.in");
    expect(feed.warnings.some((warning) => warning.startsWith("CERT-In:"))).toBe(true);
    expect(feed.sources.filter((source) => !source.ok).length).toBeGreaterThan(0);
    const again = await loadThreats((async () => {
      throw new Error("should use the cache");
    }) as typeof fetch, 1_700_000_000_000 + 1000);
    expect(again.items).toHaveLength(feed.items.length);
    expect(calls.length).toBe(8);
  });

  it("serves the previous cache when every source fails later", async () => {
    resetThreatCache();
    const ok = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("known_exploited_vulnerabilities.json")) return jsonResponse(KEV);
      return new Response("no", { status: 503 });
    }) as typeof fetch;
    const first = await loadThreats(ok, 5_000_000);
    expect(first.stale).toBe(false);
    expect(first.items.length).toBeGreaterThan(0);
    const fail = (async () => new Response("down", { status: 503 })) as typeof fetch;
    const stale = await loadThreats(fail, 5_000_000 + 50 * 60 * 1000);
    expect(stale.stale).toBe(true);
    expect(stale.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id));
    expect(stale.error).toBeNull();
    resetThreatCache();
    const empty = await loadThreats(fail, 9_000_000);
    expect(empty.items).toEqual([]);
    expect(empty.error).toBe("Threat records could not be loaded from any source.");
    expect(empty.sources.every((source) => source.ok === false)).toBe(true);
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}
