import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl, isBlockedIp, SsrfError } from "@/lib/security/ssrf";

describe("scanner target checks", () => {
  it("blocks loopback, private, link-local, and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.1.9", "172.16.4.1", "169.254.169.254", "0.0.0.0", "::1", "fc00::1", "fe80::1"]) {
      expect(isBlockedIp(ip)).toBe(true);
    }
    expect(isBlockedIp("8.8.8.8")).toBe(false);
    expect(isBlockedIp("203.0.113.10")).toBe(true);
  });

  it("rejects hosts and ports the scanner must not touch", () => {
    const blocked = [
      "http://127.0.0.1/",
      "http://169.254.169.254/latest/meta-data",
      "http://localhost/admin",
      "http://metadata.google.internal/",
      "https://app.internal/health",
      "http://example.com:22/",
      "file:///etc/passwd",
      "http://user:pass@example.com/",
      "http://2130706433/",
    ];
    for (const url of blocked) {
      expect(() => assertPublicHttpUrl(url), url).toThrow(SsrfError);
    }
  });

  it("accepts a public https URL on a web port", () => {
    const url = assertPublicHttpUrl("https://example.com/pricing");
    expect(url.hostname).toBe("example.com");
    expect(url.protocol).toBe("https:");
  });
});
