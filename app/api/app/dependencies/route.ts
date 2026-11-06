import { z } from "zod";
import { crossOriginDenied, demoDenied, jsonError, requireApiUser, viewerDenied } from "@/lib/api";
import { prisma } from "@/lib/db";
import { queryOsv } from "@/lib/deps/osv";
import { parseManifest } from "@/lib/deps/parse";
import { rateLimitShared } from "@/lib/security/rate-limit";

const schema = z.object({
  kind: z.enum(["package.json", "requirements.txt"]),
  manifest: z.string().min(1).max(200_000),
});

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const denied = demoDenied(user) ?? viewerDenied(user);
  if (denied) return denied;
  const gate = await rateLimitShared(`deps:${user.id}`, 10, 60 * 60_000);
  if (!gate.ok) return jsonError("Dependency review rate limit reached.", 429);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Paste a package.json or requirements.txt.", 400);
  try {
    const packages = parseManifest(parsed.data.manifest, parsed.data.kind);
    if (!packages.length) return jsonError("No packages were found in that manifest.", 400);
    const results = await queryOsv(packages);
    const vulnCount = results.filter((item) => item.vulns.length > 0).length;
    const review = await prisma.dependencyReview.create({
      data: {
        userId: user.id,
        kind: parsed.data.kind,
        packageCount: results.length,
        vulnCount,
        resultJson: JSON.stringify(results),
      },
    });
    return Response.json({ id: review.id, vulnCount, packageCount: results.length });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Dependency review failed.", 502);
  }
}
