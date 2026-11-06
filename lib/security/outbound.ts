import { isIP } from "node:net";

export const OUTBOUND_HOSTS = new Set([
  "www.cisa.gov",
  "www.ncsc.gov.uk",
  "sec.cloudapps.cisco.com",
  "api.msrc.microsoft.com",
  "api.github.com",
  "euvdservices.enisa.europa.eu",
  "www.cert-in.org.in",
  "services.nvd.nist.gov",
  "api.osv.dev",
  "api.xposedornot.com",
  "haveibeenpwned.com",
  "api.pwnedpasswords.com",
]);

export class OutboundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutboundError";
  }
}

export function assertOutboundUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new OutboundError("The outbound URL was rejected.");
  }
  if (url.protocol !== "https:" || url.username || url.password || isIP(url.hostname)) {
    throw new OutboundError("The outbound URL was rejected.");
  }
  if (!OUTBOUND_HOSTS.has(url.hostname.toLowerCase())) {
    throw new OutboundError("The outbound host is not allowlisted.");
  }
  return url;
}
