import { z } from "zod";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { appendTraffic } from "@/lib/ledger/record";
import { rateLimitShared } from "@/lib/security/rate-limit";
import { hashSecret } from "@/lib/security/secrets";

export const runtime = "nodejs";

const schema = z.object({
  method: z.string().trim().min(1).max(12),
  path: z.string().trim().min(1).max(2048),
  status: z.number().int().min(100).max(599).nullable().optional(),
  ip: z.string().trim().max(64).optional(),
  userAgent: z.string().max(512).optional(),
  referer: z.string().max(512).optional(),
  source: z.enum(["server", "browser", "manual"]).optional(),
});

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return jsonError("Missing bearer token.", 401);
  const site = await prisma.site.findUnique({ where: { ingestKeyHash: hashSecret(token) } });
  if (!site) return jsonError("Unknown ingest key.", 401);
  if (site.isDemo) return jsonError("The demo property does not accept new events.", 403);
  const gate = await rateLimitShared(`ingest:${site.id}`, 120, 60_000);
  if (!gate.ok) return jsonError("Ingest rate limit reached.", 429);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Event was not valid.", 400);
  if (/[\r\n]/.test(parsed.data.path) || /[\r\n]/.test(parsed.data.userAgent ?? "")) {
    return jsonError("Event fields cannot contain newlines.", 400);
  }
  const event = await appendTraffic(site.id, {
    method: parsed.data.method.toUpperCase(),
    path: parsed.data.path.startsWith("/") ? parsed.data.path : `/${parsed.data.path}`,
    status: parsed.data.status ?? null,
    ip: parsed.data.ip || "unknown",
    userAgent: parsed.data.userAgent ?? "",
    referer: parsed.data.referer ?? "",
    source: parsed.data.source ?? "server",
  });
  return Response.json({ id: event.id, agent: event.agent, category: event.category, hash: event.hash });
}
