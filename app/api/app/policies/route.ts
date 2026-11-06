import { z } from "zod";
import { crossOriginDenied, demoDenied, jsonError, requireApiUser, viewerDenied } from "@/lib/api";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/security/rate-limit";

const rule = z.object({
  agent: z.string().min(1).max(80),
  access: z.enum(["allow", "deny"]),
  training: z.enum(["allow", "deny"]),
  scraping: z.enum(["allow", "deny"]),
});

const schema = z.object({
  siteId: z.string().min(1),
  rules: z.array(rule).min(1).max(80),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const denied = demoDenied(user) ?? viewerDenied(user);
  if (denied) return denied;
  const gate = await rateLimitShared(`policy:${user.id}`, 30, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many policy saves. Wait before trying again.", 429, { retryAfterSec: gate.retryAfterSec });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Policy payload was not valid.", 400);
  const site = await prisma.site.findFirst({ where: { id: parsed.data.siteId, userId: user.id } });
  if (!site) return jsonError("Property not found.", 404);
  await prisma.policy.upsert({
    where: { siteId: site.id },
    update: { rulesJson: JSON.stringify(parsed.data.rules) },
    create: { siteId: site.id, rulesJson: JSON.stringify(parsed.data.rules) },
  });
  return Response.json({ ok: true });
}
