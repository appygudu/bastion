import { randomBytes } from "node:crypto";
import { z } from "zod";
import { audit } from "@/lib/audit/log";
import { crossOriginDenied, demoDenied, jsonError, requireApiUser, viewerDenied } from "@/lib/api";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/security/rate-limit";
import { sealSecret } from "@/lib/security/seal";
import { assertPublicHttpUrl, resolvePublicAddress, SsrfError } from "@/lib/security/ssrf";
import { workspaceLimits } from "@/lib/workspace/limits";

export const runtime = "nodejs";

const schema = z.object({ url: z.string().trim().min(1).max(2048) });

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const denied = demoDenied(user) ?? viewerDenied(user);
  if (denied) return denied;
  const gate = await rateLimitShared(`webhook:${user.id}`, 20, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many webhook changes.", 429);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter an https URL.", 400);
  const limits = workspaceLimits(user.plan);
  const count = await prisma.webhookEndpoint.count({ where: { userId: user.id, enabled: true } });
  if (count >= limits.webhooks) return jsonError(`This ${user.plan} workspace can have ${limits.webhooks} webhooks.`, 400);
  try {
    const url = assertPublicHttpUrl(parsed.data.url);
    if (url.protocol !== "https:") return jsonError("Webhooks require https.", 400);
    await resolvePublicAddress(url.hostname);
    const secret = `whsec_${randomBytes(24).toString("base64url")}`;
    const row = await prisma.webhookEndpoint.create({
      data: { userId: user.id, url: url.toString(), secretCipher: sealSecret(secret) },
    });
    await audit(user.id, user.actorId, "webhook.create", row.id);
    return Response.json({ id: row.id, url: row.url, secret });
  } catch (err) {
    const message = err instanceof SsrfError ? err.message : "That URL cannot be used.";
    return jsonError(message, 400);
  }
}
