import { clientKey, crossOriginDenied, jsonError } from "@/lib/api";
import { lookupPackage, normalizePackage } from "@/lib/exposure/advisories";
import { ExposureError } from "@/lib/exposure/email";
import { EXPOSURE_DISCLAIMER, exposureRateKey } from "@/lib/exposure/privacy";
import { rateLimitShared } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Enter a package name.", 400);
  const website = "website" in body && typeof body.website === "string" ? body.website : "";
  const ecosystem = "ecosystem" in body && typeof body.ecosystem === "string" ? body.ecosystem : "";
  const name = "name" in body && typeof body.name === "string" ? body.name : "";
  const pkg = normalizePackage(ecosystem, name);
  if (!pkg) return jsonError("Enter an npm or PyPI package name.", 400);
  const gate = await rateLimitShared(exposureRateKey("package", clientKey(request, "local")), 12, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many package checks from this network. Wait before trying again.", 429, { retryAfterSec: gate.retryAfterSec });
  if (website.trim()) return jsonError("The check could not be completed.", 400);
  try {
    const advisories = await lookupPackage(pkg);
    return Response.json(
      { package: pkg, advisories, disclaimer: EXPOSURE_DISCLAIMER },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof ExposureError ? error.message : "OSV.dev could not be reached.";
    return jsonError(message, 502);
  }
}
