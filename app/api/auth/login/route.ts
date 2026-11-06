import { z } from "zod";
import { clientKey, crossOriginDenied, jsonError } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/security/rate-limit";

const schema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(10).max(200),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return jsonError("Email and password are required.", 400);
  const email = parsed.data.email.toLowerCase();
  const ip = clientKey(request, "local");
  const ipLimit = await rateLimitShared(`login-ip:${ip}`, 30, 15 * 60_000);
  if (!ipLimit.ok) return jsonError("Too many sign-in attempts. Wait and try again.", 429, { retryAfterSec: ipLimit.retryAfterSec });
  const limit = await rateLimitShared(`login:${email}:${ip}`, 8, 15 * 60_000);
  if (!limit.ok) return jsonError("Too many sign-in attempts. Wait and try again.", 429, { retryAfterSec: limit.retryAfterSec });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return jsonError("Email or password is incorrect.", 401);
  }
  await createSession(user.id);
  return Response.json({ ok: true });
}
