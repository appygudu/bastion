import { z } from "zod";
import { audit } from "@/lib/audit/log";
import { crossOriginDenied, demoDenied, jsonError, requireApiUser, viewerDenied } from "@/lib/api";
import { prisma } from "@/lib/db";
import { rulesFromLists } from "@/lib/guardrails/policy";
import { rateLimitShared } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const decision = z.enum(["allow", "flag", "deny"]);
const schema = z.object({
  tools: z.array(z.object({ name: z.string().trim().min(1).max(80), decision })).max(40),
  domains: z.array(z.object({ host: z.string().trim().min(1).max(253), decision })).max(40),
  onInjection: z.enum(["flag", "deny"]),
  onRiskyTool: z.enum(["flag", "deny"]),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const denied = demoDenied(user) ?? viewerDenied(user);
  if (denied) return denied;
  const gate = await rateLimitShared(`guardrail:${user.id}`, 30, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many policy saves.", 429);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("The guardrail policy is not valid.", 400);
  const rules = rulesFromLists(parsed.data);
  if (!rules) return jsonError("Use a tool name or a hostname, and allow, flag, or deny.", 400);
  await prisma.guardrailPolicy.upsert({
    where: { userId: user.id },
    create: { userId: user.id, rulesJson: JSON.stringify(rules) },
    update: { rulesJson: JSON.stringify(rules) },
  });
  await audit(user.id, user.actorId, "guardrail.update", `${parsed.data.tools.length} tools, ${parsed.data.domains.length} domains`);
  return Response.json({ ok: true });
}
