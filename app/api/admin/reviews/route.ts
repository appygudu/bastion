import { z } from "zod";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { crossOriginDenied, jsonError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  id: z.string().min(1).max(40),
  status: z.enum(["new", "contacted", "closed"]),
});

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  if (!isPlatformAdmin(user)) return jsonError("This action is limited to the deployment operator.", 403);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Choose a status.", 400);
  const row = await prisma.securityReviewRequest.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } }).catch(() => null);
  if (!row) return jsonError("Request not found.", 404);
  return Response.json({ id: row.id, status: row.status });
}
