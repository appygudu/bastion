type MemoryRow = { payload: string; fetchedAt: number };

const memory = new Map<string, MemoryRow>();

export function resetSnapshots() {
  memory.clear();
}

export function forgetSnapshot(id: string) {
  memory.delete(id);
}

export async function readSnapshot<T>(id: string, revive: (value: unknown) => T | null): Promise<{ value: T; fetchedAt: number } | null> {
  const local = memory.get(id);
  if (local) {
    const value = revive(JSON.parse(local.payload));
    if (value) return { value, fetchedAt: local.fetchedAt };
  }
  if (process.env.VITEST) return null;
  try {
    const { prisma } = await import("@/lib/db");
    const row = await prisma.feedSnapshot.findUnique({ where: { id } });
    if (!row) return null;
    const value = revive(JSON.parse(row.payload));
    if (!value) return null;
    memory.set(id, { payload: row.payload, fetchedAt: row.fetchedAt.getTime() });
    return { value, fetchedAt: row.fetchedAt.getTime() };
  } catch {
    return null;
  }
}

export async function writeSnapshot(id: string, value: unknown, fetchedAt: number): Promise<void> {
  const payload = JSON.stringify(value);
  memory.set(id, { payload, fetchedAt });
  if (process.env.VITEST) return;
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.feedSnapshot.upsert({
      where: { id },
      create: { id, payload, fetchedAt: new Date(fetchedAt) },
      update: { payload, fetchedAt: new Date(fetchedAt) },
    });
  } catch {
    // The in-memory copy still serves this instance. The next cold start tries again.
  }
}
