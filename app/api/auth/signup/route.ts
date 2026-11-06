import { z } from "zod";
import { clientKey, crossOriginDenied, jsonError } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/security/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  orgName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  password: z.string().min(10).max(200).regex(/[A-Za-z]/, "Use at least one letter.").regex(/[0-9]/, "Use at least one number."),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const limit = await rateLimitShared(`signup:${clientKey(request, "local")}`, 5, 60 * 60_000);
  if (!limit.ok) return jsonError("Too many new workspaces from this network. Try later.", 429, { retryAfterSec: limit.retryAfterSec });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Check the form.", 400);
  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("That email already has a workspace.", 409);
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      orgName: parsed.data.orgName,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });
  await createSession(user.id);
  return Response.json({ ok: true });
}
