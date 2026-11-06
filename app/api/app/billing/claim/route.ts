import { z } from "zod";
import { audit } from "@/lib/audit/log";
import { crossOriginDenied, demoDenied, jsonError, ownerDenied, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/security/rate-limit";
import { validPaymentClaim } from "@/lib/workspace/limits";

export const runtime = "nodejs";

const schema = z.object({
  transactionId: z.string().trim().min(6).max(40),
  payerEmail: z.string().trim().email().max(180),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const denied = demoDenied(user) ?? ownerDenied(user);
  if (denied) return denied;
  const gate = await rateLimitShared(`claim:${user.actorId}`, 8, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many payment claims. Wait before submitting another.", 429, { retryAfterSec: gate.retryAfterSec });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !validPaymentClaim(parsed.data)) {
    return jsonError("Enter the PayPal transaction id and the payer email.", 400);
  }
  const pending = await prisma.paymentClaim.findFirst({ where: { userId: user.id, status: "pending" } });
  if (pending) return jsonError("A claim is already waiting for review.", 409);
  const claim = await prisma.paymentClaim.create({
    data: {
      userId: user.id,
      transactionId: parsed.data.transactionId.trim(),
      payerEmail: parsed.data.payerEmail.trim().toLowerCase(),
      note: parsed.data.note ?? "",
    },
  });
  await audit(user.id, user.actorId, "claim.submit", claim.id);
  return Response.json({ id: claim.id, status: claim.status });
}
