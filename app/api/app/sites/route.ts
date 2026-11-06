import { z } from "zod";
import { crossOriginDenied, demoDenied, jsonError, requireApiUser, viewerDenied } from "@/lib/api";
import { defaultPolicy } from "@/lib/bots/policy";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/security/rate-limit";
import { newIngestKey } from "@/lib/security/secrets";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  hostname: z.string().trim().toLowerCase().regex(/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/, "Enter a hostname such as www.example.com."),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const denied = demoDenied(user) ?? viewerDenied(user);
  if (denied) return denied;
  const gate = await rateLimitShared(`sites:${user.id}`, 20, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many property changes. Wait before trying again.", 429, { retryAfterSec: gate.retryAfterSec });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Check the property.", 400);
  const count = await prisma.site.count({ where: { userId: user.id } });
  if (count >= 20) return jsonError("This workspace already has 20 properties.", 400);
  const key = newIngestKey();
  const site = await prisma.site.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      hostname: parsed.data.hostname,
      ingestPrefix: key.prefix,
      ingestKeyHash: key.hash,
      policy: { create: { rulesJson: JSON.stringify(defaultPolicy()) } },
    },
  });
  return Response.json({ id: site.id, ingestKey: key.token });
}
