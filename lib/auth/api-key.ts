import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { hashSecret } from "@/lib/security/secrets";
import { hasScope, type ApiScope } from "@/lib/workspace/limits";

export async function requireApiKey(request: Request, scope: ApiScope) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith("bsk_")) return { user: null, error: jsonError("Send a workspace API key as a bearer token.", 401) };
  const row = await prisma.apiKey.findUnique({ where: { keyHash: hashSecret(token) } });
  if (!row || row.revokedAt) return { user: null, error: jsonError("Unknown API key.", 401) };
  if (!hasScope(row.scopes, scope)) return { user: null, error: jsonError(`This key does not include ${scope}.`, 403) };
  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user || user.isDemo) return { user: null, error: jsonError("This key cannot be used.", 403) };
  await prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  return { user, error: null };
}
