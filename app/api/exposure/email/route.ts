import { clientKey, crossOriginDenied, jsonError } from "@/lib/api";
import { ExposureError, lookupEmail, normalizeEmail } from "@/lib/exposure/email";
import { exposureRateKey } from "@/lib/exposure/privacy";
import { rateLimitShared } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Enter an email address.", 400);
  const website = "website" in body && typeof body.website === "string" ? body.website : "";
  const email = "email" in body && typeof body.email === "string" ? normalizeEmail(body.email) : null;
  if (!email) return jsonError("Enter a single email address.", 400);

  const ip = clientKey(request, "local");
  const ipGate = await rateLimitShared(exposureRateKey("email-ip", ip), 5, 60 * 60_000);
  if (!ipGate.ok) return jsonError("Too many email checks from this network. Wait before trying again.", 429, { retryAfterSec: ipGate.retryAfterSec });
  const targetGate = await rateLimitShared(exposureRateKey("email-target", email), 4, 24 * 60 * 60_000);
  if (!targetGate.ok) return jsonError("That address was checked recently. Wait before trying it again.", 429, { retryAfterSec: targetGate.retryAfterSec });
  if (website.trim()) return jsonError("The check could not be completed.", 400);

  try {
    const result = await lookupEmail(email, { hibpApiKey: process.env.HIBP_API_KEY });
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof ExposureError ? error.message : "The breach catalog could not be reached.";
    return jsonError(message, 502);
  }
}
