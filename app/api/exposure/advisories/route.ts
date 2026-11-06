import { clientKey, jsonError } from "@/lib/api";
import { loadAdvisories } from "@/lib/exposure/advisories";
import { EXPOSURE_DISCLAIMER, exposureRateKey } from "@/lib/exposure/privacy";
import { rateLimitShared } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const gate = await rateLimitShared(exposureRateKey("advisories", clientKey(request, "local")), 30, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many advisory refreshes from this network.", 429, { retryAfterSec: gate.retryAfterSec });
  const feed = await loadAdvisories();
  return Response.json(
    { ...feed, disclaimer: EXPOSURE_DISCLAIMER },
    { headers: { "cache-control": feed.error ? "no-store" : "public, max-age=300" } },
  );
}
