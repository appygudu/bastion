import { z } from "zod";
import { audit } from "@/lib/audit/log";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { crossOriginDenied, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notify/send";
import { rateLimitShared } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  id: z.string().min(1).max(40),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  if (!isPlatformAdmin(user)) return jsonError("This action is limited to the deployment operator.", 403);
  const gate = await rateLimitShared(`admin-claim:${user.actorId}`, 30, 60 * 60_000);
  if (!gate.ok) return jsonError("Too many reviews.", 429);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Choose approve or reject.", 400);
  const claim = await prisma.paymentClaim.findUnique({ where: { id: parsed.data.id } });
  if (!claim || claim.status !== "pending") return jsonError("That claim is not waiting.", 404);
  await prisma.paymentClaim.update({
    where: { id: claim.id },
    data: { status: parsed.data.decision, reviewNote: parsed.data.note ?? "", reviewedAt: new Date() },
  });
  if (parsed.data.decision === "approved") {
    await prisma.user.update({ where: { id: claim.userId }, data: { plan: "team" } });
  }
  await audit(claim.userId, user.actorId, `claim.${parsed.data.decision}`, claim.id);
  await notifyUser(claim.userId, {
    title: parsed.data.decision === "approved" ? "Team plan approved" : "Payment claim was not approved",
    body: parsed.data.decision === "approved"
      ? "The operator marked this workspace as Team. Weekly re-scans and email notifications are now available when those services are configured."
      : (parsed.data.note || "The operator did not approve this payment claim."),
    href: "/app/billing",
    email: true,
  });
  return Response.json({ id: claim.id, status: parsed.data.decision });
}
