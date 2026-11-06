import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import type { TlsObservation } from "@/lib/types";
import { prepareTarget, SsrfError } from "@/lib/security/ssrf";

export const SCANNER_UA = "BastionScanner/1.0 (+passive; ownership-attested; no exploit payloads)";

const CERT_CODES = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "CERT_UNTRUSTED",
]);

export interface RawResponse {
  status: number;
  headers: Record<string, string | string[]>;
  body: string;
  truncated: boolean;
  finalUrl: string;
  address: string;
  tls: TlsObservation | null;
  insecureRetry: boolean;
}

function certError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  if (err.code && CERT_CODES.has(err.code)) return true;
  return /certificate|altname|self signed|unable to verify/i.test(err.message ?? "");
}

function daysRemaining(validTo: string | undefined): number | null {
  if (!validTo) return null;
  const expires = Date.parse(validTo);
  if (Number.isNaN(expires)) return null;
  return Math.floor((expires - Date.now()) / 86_400_000);
}

function tlsFromSocket(socket: tls.TLSSocket | null, authorizationError: string | null): TlsObservation | null {
  if (!socket || typeof socket.getPeerCertificate !== "function") return null;
  const cert = socket.getPeerCertificate();
  const cipher = socket.getCipher();
  const subject = cert && "subject" in cert ? formatName(cert.subject) : null;
  const issuer = cert && "issuer" in cert ? formatName(cert.issuer) : null;
  return {
    protocol: socket.getProtocol?.() ?? null,
    cipher: cipher?.name ?? null,
    authorized: authorizationError ? false : Boolean(socket.authorized),
    authorizationError,
    validFrom: cert?.valid_from ?? null,
    validTo: cert?.valid_to ?? null,
    subject,
    issuer,
    daysRemaining: daysRemaining(cert?.valid_to),
  };
}

function formatName(name: tls.PeerCertificate["subject"] | undefined): string | null {
  if (!name) return null;
  const parts = Object.entries(name).map(([key, value]) => `${key}=${value}`);
  return parts.length ? parts.join(", ") : null;
}

function requestOnce(
  url: URL,
  address: string,
  options: { method: "GET" | "HEAD"; headers: Record<string, string>; maxBytes: number; timeoutMs: number; insecure: boolean },
): Promise<{ status: number; headers: Record<string, string | string[]>; body: string; truncated: boolean; tls: TlsObservation | null }> {
  const lib = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: address,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        method: options.method,
        path: `${url.pathname}${url.search}`,
        headers: {
          Host: url.host,
          "User-Agent": SCANNER_UA,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          Connection: "close",
          ...options.headers,
        },
        servername: url.hostname,
        rejectUnauthorized: !options.insecure,
        timeout: options.timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        const socket: tls.TLSSocket | null = res.socket instanceof tls.TLSSocket ? res.socket : null;
        const tlsInfo = url.protocol === "https:" ? tlsFromSocket(socket, options.insecure ? "Certificate verification failed on the first attempt." : null) : null;
        res.on("data", (chunk: Buffer) => {
          if (options.maxBytes === 0) {
            truncated = true;
            res.destroy();
            return;
          }
          size += chunk.length;
          if (size > options.maxBytes) {
            truncated = true;
            chunks.push(chunk.subarray(0, Math.max(0, options.maxBytes - (size - chunk.length))));
            res.destroy();
            return;
          }
          chunks.push(chunk);
        });
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          const headers: Record<string, string | string[]> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            if (value != null) headers[key.toLowerCase()] = value;
          }
          resolve({
            status: res.statusCode ?? 0,
            headers,
            body: Buffer.concat(chunks).toString("utf8"),
            truncated,
            tls: tlsInfo,
          });
        };
        res.on("end", finish);
        res.on("close", finish);
        res.on("error", (error) => {
          if (truncated || size > 0) finish();
          else reject(error);
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    req.end();
  });
}

export async function safeFetch(
  rawUrl: string,
  options: { method?: "GET" | "HEAD"; headers?: Record<string, string>; maxBytes?: number; timeoutMs?: number; redirects?: number } = {},
): Promise<RawResponse> {
  let current = rawUrl;
  let method = options.method ?? "GET";
  let insecure = false;
  let certMessage: string | null = null;
  const seen = new Set<string>();
  const redirects = options.redirects ?? 3;
  for (let hop = 0; hop <= redirects; hop++) {
    if (seen.has(`${method} ${current}`)) throw new SsrfError("Redirect loop.");
    seen.add(`${method} ${current}`);
    const { url, address } = await prepareTarget(current);
    try {
      const response = await requestOnce(url, address, {
        method,
        headers: options.headers ?? {},
        maxBytes: options.maxBytes ?? 262_144,
        timeoutMs: options.timeoutMs ?? 8000,
        insecure,
      });
      if (certMessage && response.tls) response.tls.authorizationError = certMessage;
      const location = response.headers.location;
      const loc = Array.isArray(location) ? location[0] : location;
      if (loc && [301, 302, 303, 307, 308].includes(response.status) && hop < redirects) {
        current = new URL(loc, url).toString();
        if (response.status === 301 || response.status === 302 || response.status === 303) method = "GET";
        continue;
      }
      return {
        ...response,
        finalUrl: url.toString(),
        address,
        insecureRetry: insecure,
        tls: response.tls ? { ...response.tls, authorized: certMessage ? false : response.tls.authorized } : null,
      };
    } catch (error) {
      if (!insecure && url.protocol === "https:" && certError(error)) {
        insecure = true;
        certMessage = error instanceof Error ? error.message : "Certificate verification failed";
        hop -= 1;
        continue;
      }
      throw error;
    }
  }
  throw new SsrfError("Too many redirects.");
}

export function headerLine(headers: Record<string, string | string[]>, name: string): string | null {
  const value = headers[name.toLowerCase()];
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
