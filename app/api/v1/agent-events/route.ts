import { z } from "zod";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { appendAgentEvent } from "@/lib/ledger/record";
import { rateLimitShared } from "@/lib/security/rate-limit";
import { hashSecret } from "@/lib/security/secrets";

export const runtime = "nodejs";

const schema = z.object({
  agentName: z.string().trim().min(1).max(120),
  tool: z.string().trim().min(1).max(120),
  outcome: z.string().trim().min(1).max(64),
  content: z.string().max(50_000).optional(),
  promptHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return jsonError("Missing bearer token.", 401);
  const site = await prisma.site.findUnique({ where: { ingestKeyHash: hashSecret(token) } });
  if (!site) return jsonError("Unknown ingest key.", 401);
  if (site.isDemo) return jsonError("The demo property does not accept new events.", 403);
  const gate = await rateLimitShared(`agent:${site.id}`, 60, 60_000);
  if (!gate.ok) return jsonError("Agent ingest rate limit reached.", 429);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Agent event was not valid.", 400);
  if (!parsed.data.content && parsed.data.promptHash) {
    return jsonError("Send content so Bastion can hash it. A client-supplied hash alone is not evaluated.", 400);
  }
  const event = await appendAgentEvent(site.id, {
    agentName: parsed.data.agentName,
    tool: parsed.data.tool,
    outcome: parsed.data.outcome,
    content: parsed.data.content ?? "",
  });
  return Response.json({ id: event.id, promptHash: event.promptHash, findings: JSON.parse(event.findingsJson), decision: event.decision });
}
