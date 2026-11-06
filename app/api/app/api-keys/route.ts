import { z } from "zod";
import { audit } from "@/lib/audit/log";
import { crossOriginDenied, demoDenied, jsonError, requireApiUser, viewerDenied } from "@/lib/api";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/security/rate-limit";
import { newIngestKey } from "@/lib/security/secrets";
import { API_SCOPES, workspaceLimits } from "@/lib/workspace/limits";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  scopes: z.array(z.enum(API_SCOPES)).min(1),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const denied = demoDenied(user) ?? viewerDenied(user);
  if (denied) return denied;
  const gate = await rateLimitShared(`apikey:${user.id}`, 20, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many API keys were created.", 429);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Name the key and choose scans:read, scans:write, or both.", 400);
  const limits = workspaceLimits(user.plan);
  const active = await prisma.apiKey.count({ where: { userId: user.id, revokedAt: null } });
  if (active >= limits.apiKeys) return jsonError(`This ${user.plan} workspace can have ${limits.apiKeys} active API keys.`, 400);
  const minted = newIngestKey();
  const scopes = [...new Set(parsed.data.scopes)].join(",");
  const row = await prisma.apiKey.create({
    data: { userId: user.id, name: parsed.data.name, prefix: minted.prefix, keyHash: minted.hash, scopes },
  });
  await audit(user.id, user.actorId, "apikey.create", `${row.id} ${scopes}`);
  return Response.json({ id: row.id, token: minted.token, prefix: row.prefix, scopes });
}
