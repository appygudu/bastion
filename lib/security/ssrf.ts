import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const WEB_PORTS = new Set([80, 443, 8080, 8443]);

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google.com",
  "metadata.amazonaws.com",
  "instance-data",
  "kubernetes",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

const v4 = new BlockList();
for (const [cidr, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  v4.addSubnet(cidr, prefix, "ipv4");
}
v4.addAddress("255.255.255.255", "ipv4");

const v6 = new BlockList();
v6.addAddress("::", "ipv6");
v6.addAddress("::1", "ipv6");
v6.addSubnet("fc00::", 7, "ipv6");
v6.addSubnet("fe80::", 10, "ipv6");
v6.addSubnet("ff00::", 8, "ipv6");
v6.addSubnet("2001:db8::", 32, "ipv6");

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

export function isBlockedIp(ip: string): boolean {
  const normalized = ip.toLowerCase();
  const mapped = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
  const kind = isIP(mapped);
  if (kind === 4) return v4.check(mapped, "ipv4");
  if (isIP(normalized) === 6) return v6.check(normalized, "ipv6") || (mapped !== normalized && isBlockedIp(mapped));
  return true;
}

function blockedHostname(host: string): boolean {
  const name = host.replace(/\.$/, "").toLowerCase();
  if (BLOCKED_HOSTS.has(name)) return true;
  if (name.endsWith(".localhost") || name.endsWith(".local") || name.endsWith(".internal") || name.endsWith(".localdomain")) {
    return true;
  }
  if (/^\d+$/.test(name)) return true;
  return false;
}

export function assertPublicHttpUrl(raw: string): URL {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) {
    throw new SsrfError("Enter a web URL under 2048 characters.");
  }
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new SsrfError("That is not a valid URL.");
  }
  if (url.username || url.password) {
    throw new SsrfError("URLs with embedded credentials are not allowed.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("Only http and https URLs can be assessed.");
  }
  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  if (!host || blockedHostname(host)) {
    throw new SsrfError("That host is not eligible for scanning.");
  }
  if (isIP(host) && isBlockedIp(host)) {
    throw new SsrfError("Private, loopback, link-local, and metadata addresses cannot be scanned.");
  }
  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (!WEB_PORTS.has(port)) {
    throw new SsrfError("Bastion only connects to web ports 80, 443, 8080, and 8443.");
  }
  return url;
}

export async function resolvePublicAddress(hostname: string): Promise<string> {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  if (isIP(host)) {
    if (isBlockedIp(host)) {
      throw new SsrfError("Private, loopback, link-local, and metadata addresses cannot be scanned.");
    }
    return host;
  }
  const records = await Promise.race([
    lookup(host, { all: true, verbatim: true }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new SsrfError("DNS lookup timed out.")), 4000);
    }),
  ]);
  if (!records.length) throw new SsrfError("Host did not resolve.");
  for (const record of records) {
    if (isBlockedIp(record.address)) {
      throw new SsrfError("Host resolves to a private, loopback, link-local, or metadata address.");
    }
  }
  return records[0].address;
}

export async function prepareTarget(raw: string): Promise<{ url: URL; address: string }> {
  const url = assertPublicHttpUrl(raw);
  const address = await resolvePublicAddress(url.hostname);
  return { url, address };
}
