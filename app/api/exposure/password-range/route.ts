import { clientKey, crossOriginDenied, jsonError } from "@/lib/api";
import { fetchPwnedRange } from "@/lib/exposure/password-range";
import { exposureRateKey } from "@/lib/exposure/privacy";
import { rangePrefixFromBody } from "@/lib/exposure/password";
import { rateLimitShared } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const prefix = rangePrefixFromBody(await request.json().catch(() => null));
  if (!prefix) return jsonError("Send only a 5-character hash prefix.", 400);
  const gate = await rateLimitShared(exposureRateKey("password-range", clientKey(request, "local")), 20, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many password range checks from this network.", 429, { retryAfterSec: gate.retryAfterSec });
  try {
    const range = await fetchPwnedRange(prefix);
    return Response.json({ range }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The Pwned Passwords range API could not be reached.";
    return jsonError(message, 502);
  }
}
