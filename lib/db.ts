import { PrismaClient } from "@prisma/client";

function serverlessDatabaseUrl(raw: string): string {
  if (process.env.VERCEL !== "1" || !raw.startsWith("postgres")) return raw;
  const url = new URL(raw);
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "1");
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "15");
  const pooled = url.hostname.includes("pooler");
  if (pooled && !url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
  return url.toString();
}

const databaseUrl = serverlessDatabaseUrl(process.env.DATABASE_URL ?? "");
if (process.env.VERCEL === "1" && databaseUrl.startsWith("file:")) {
  throw new Error("SQLite files do not survive Vercel's serverless filesystem. Set DATABASE_URL to a Postgres connection string.");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl || undefined });

globalForPrisma.prisma = prisma;
