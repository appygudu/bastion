type Bucket = number[];

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { ok: boolean; retryAfterSec: number } {
  const windowStart = now - windowMs;
  const current = (buckets.get(key) ?? []).filter((ts) => ts > windowStart);
  if (current.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((current[0] + windowMs - now) / 1000));
    buckets.set(key, current);
    return { ok: false, retryAfterSec };
  }
  current.push(now);
  buckets.set(key, current);
  return { ok: true, retryAfterSec: 0 };
}

export function resetRateLimits() {
  buckets.clear();
}

export async function rateLimitShared(key: string, limit: number, windowMs: number, now = Date.now()) {
  const local = rateLimit(key, limit, windowMs, now);
  if (!local.ok) return local;
  const { prisma } = await import("@/lib/db");
  const since = new Date(now - windowMs);
  await prisma.rateHit.deleteMany({ where: { key, createdAt: { lte: since } } });
  const recent = await prisma.rateHit.count({ where: { key, createdAt: { gt: since } } });
  if (recent >= limit) {
    const oldest = await prisma.rateHit.findFirst({
      where: { key, createdAt: { gt: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const retryAfterSec = oldest
      ? Math.max(1, Math.ceil((oldest.createdAt.getTime() + windowMs - now) / 1000))
      : 1;
    return { ok: false, retryAfterSec };
  }
  await prisma.rateHit.create({ data: { key } });
  return { ok: true, retryAfterSec: 0 };
}
