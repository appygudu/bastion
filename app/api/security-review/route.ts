import { z } from "zod";
import { clientKey, crossOriginDenied, jsonError } from "@/lib/api";
import { adminEmails } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { sendWorkspaceEmail } from "@/lib/notify/send";
import { rateLimitShared } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(180),
  company: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const gate = await rateLimitShared(`review:${clientKey(request, "local")}`, 6, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many review requests from this network.", 429, { retryAfterSec: gate.retryAfterSec });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Name, work email, company, and a short note are required.", 400);
  const row = await prisma.securityReviewRequest.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      company: parsed.data.company,
      message: parsed.data.message,
    },
  });
  const operators = adminEmails();
  if (operators.length > 0) {
    await sendWorkspaceEmail(
      operators[0],
      `Security review request from ${parsed.data.company}`,
      `${parsed.data.name} <${parsed.data.email.toLowerCase()}>\n\n${parsed.data.message}`,
    );
  }
  return Response.json({ id: row.id, status: "new" });
}
