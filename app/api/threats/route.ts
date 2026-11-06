import { clientKey, jsonError } from "@/lib/api";
import { exposureRateKey } from "@/lib/exposure/privacy";
import { rateLimitShared } from "@/lib/security/rate-limit";
import { THREAT_NOTE } from "@/lib/threats/copy";
import { loadThreats } from "@/lib/threats/feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const gate = await rateLimitShared(exposureRateKey("threats", clientKey(request, "local")), 30, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many threat refreshes from this network.", 429, { retryAfterSec: gate.retryAfterSec });
  const feed = await loadThreats();
  return Response.json(
    { ...feed, note: THREAT_NOTE },
    { headers: { "cache-control": feed.error ? "no-store" : "public, max-age=300" } },
  );
}
