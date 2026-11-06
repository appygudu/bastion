import { clientKey, crossOriginDenied, jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { lookupDomainCatalog, normalizeDomain, passiveScanPermitted, scanHints } from "@/lib/exposure/domain";
import { ExposureError } from "@/lib/exposure/email";
import { EXPOSURE_DISCLAIMER, exposureRateKey } from "@/lib/exposure/privacy";
import { rateLimitShared } from "@/lib/security/rate-limit";
import { SsrfError } from "@/lib/security/ssrf";
import { runScan } from "@/lib/scanner/run";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Enter a domain name.", 400);
  const website = "website" in body && typeof body.website === "string" ? body.website : "";
  const domain = "domain" in body && typeof body.domain === "string" ? normalizeDomain(body.domain) : null;
  const scan = "scan" in body && body.scan === true;
  const attested = "attested" in body && body.attested === true;
  if (!domain) return jsonError("Enter a public domain name, without a scheme or path.", 400);
  if (!passiveScanPermitted(scan, attested)) return jsonError("Passive hints run only after you attest that you own the host or have written authority to assess it.", 400);
  if (scan) {
    const user = await getCurrentUser();
    if (!user || user.isDemo) {
      return jsonError("Passive hints run only from a signed-in workspace that is not the public demo. The catalog lookup does not contact the host.", 403);
    }
  }

  const ip = clientKey(request, "local");
  const gate = await rateLimitShared(exposureRateKey("domain", `${ip}\n${scan ? "scan" : "catalog"}`), scan ? 3 : 8, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many domain checks from this network. Wait before trying again.", 429, { retryAfterSec: gate.retryAfterSec });
  if (website.trim()) return jsonError("The check could not be completed.", 400);

  try {
    const breaches = await lookupDomainCatalog(domain);
    if (!scan) {
      return Response.json(
        { domain, breaches, scan: { status: "skipped" }, disclaimer: EXPOSURE_DISCLAIMER },
        { headers: { "cache-control": "no-store" } },
      );
    }
    try {
      const result = await runScan(`https://${domain}`);
      return Response.json(
        {
          domain,
          breaches,
          scan: { status: "completed", score: result.score, hints: scanHints(result.findings) },
          disclaimer: EXPOSURE_DISCLAIMER,
        },
        { headers: { "cache-control": "no-store" } },
      );
    } catch (error) {
      const blocked = error instanceof SsrfError;
      const message = error instanceof Error ? error.message : "The passive check failed.";
      return Response.json(
        {
          domain,
          breaches,
          scan: { status: blocked ? "blocked" : "failed", message },
          disclaimer: EXPOSURE_DISCLAIMER,
        },
        { headers: { "cache-control": "no-store" } },
      );
    }
  } catch (error) {
    const message = error instanceof ExposureError ? error.message : "The breach catalog could not be reached.";
    return jsonError(message, 502);
  }
}
