import { z } from "zod";
import { crossOriginDenied, demoDenied, jsonError, requireApiUser, viewerDenied } from "@/lib/api";
import { prisma } from "@/lib/db";
import { appendAgentEvent } from "@/lib/ledger/record";
import { rateLimitShared } from "@/lib/security/rate-limit";

const schema = z.object({
  siteId: z.string().min(1),
  agentName: z.string().trim().min(1).max(120),
  tool: z.string().trim().min(1).max(120),
  outcome: z.string().trim().min(1).max(64),
  content: z.string().max(50_000),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const denied = demoDenied(user) ?? viewerDenied(user);
  if (denied) return denied;
  const gate = await rateLimitShared(`agent-ui:${user.id}`, 30, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many tool-call logs. Wait before trying again.", 429, { retryAfterSec: gate.retryAfterSec });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Tool call fields were not valid.", 400);
  const site = await prisma.site.findFirst({ where: { id: parsed.data.siteId, userId: user.id } });
  if (!site) return jsonError("Property not found.", 404);
  const event = await appendAgentEvent(site.id, { ...parsed.data, isDemo: false });
  return Response.json({ id: event.id });
}
