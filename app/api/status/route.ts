import { clientKey, jsonError } from "@/lib/api";
import { oidcProviders } from "@/lib/auth/oidc";
import { prisma } from "@/lib/db";
import { exposureRateKey } from "@/lib/exposure/privacy";
import { emailConfigured } from "@/lib/notify/send";
import { rateLimitShared } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await rateLimitShared(exposureRateKey("threats", `status:${clientKey(request, "local")}`), 60, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many status checks from this network.", 429, { retryAfterSec: gate.retryAfterSec });
  let database: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }
  return Response.json(
    {
      ok: database === "ok",
      service: "bastion",
      database,
      scheduler: (process.env.CRON_SECRET ?? "").length >= 16 ? "armed" : "not configured",
      email: emailConfigured() ? "configured" : "not configured",
      sso: oidcProviders().length > 0 ? "configured" : "not configured",
      time: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
