import { createHash, randomBytes } from "node:crypto";

const PLACEHOLDER_SECRETS = new Set([
  "",
  "dev-only-pepper-change-me",
  "change-me-before-any-shared-deployment",
  "replace-with-32-plus-random-characters",
  "ci-only-secret-not-for-production",
]);

export function pepper(): string {
  const value = process.env.AUTH_SECRET ?? "";
  const hosted = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  if (hosted && (value.length < 32 || PLACEHOLDER_SECRETS.has(value))) {
    throw new Error("Set AUTH_SECRET to a random string of at least 32 characters.");
  }
  return value || "dev-only-pepper-change-me";
}

export function hashSecret(value: string): string {
  return createHash("sha256").update(`${pepper()}\n${value}`).digest("hex");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function newIngestKey(): { token: string; prefix: string; hash: string } {
  const token = `bsk_${randomBytes(24).toString("base64url")}`;
  return { token, prefix: token.slice(0, 12), hash: hashSecret(token) };
}

export function newSessionToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashSecret(token) };
}
