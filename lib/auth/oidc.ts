import { createPublicKey, createVerify } from "node:crypto";

export interface OidcProvider {
  id: "google" | "oidc";
  label: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
}

export function oidcProviders(env: NodeJS.ProcessEnv = process.env): OidcProvider[] {
  const providers: OidcProvider[] = [];
  const googleId = env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const googleSecret = env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  if (googleId && googleSecret) {
    providers.push({
      id: "google",
      label: "Google",
      issuer: "https://accounts.google.com",
      clientId: googleId,
      clientSecret: googleSecret,
    });
  }
  const issuer = env.OIDC_ISSUER?.trim().replace(/\/$/, "") ?? "";
  const clientId = env.OIDC_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.OIDC_CLIENT_SECRET?.trim() ?? "";
  if (issuer && clientId && clientSecret) {
    providers.push({
      id: "oidc",
      label: env.OIDC_LABEL?.trim() || "SSO",
      issuer,
      clientId,
      clientSecret,
    });
  }
  return providers;
}

export function oidcRedirectUri(origin: string, env: NodeJS.ProcessEnv = process.env): string {
  const override = env.OIDC_REDIRECT_URI?.trim() ?? "";
  if (override) return override;
  return `${origin}/api/auth/oidc/callback`;
}

export interface IdTokenClaims {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  sub?: string;
}

export function decodeIdTokenPayload(token: string): IdTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const value = JSON.parse(json) as unknown;
    if (!value || typeof value !== "object") return null;
    return value as IdTokenClaims;
  } catch {
    return null;
  }
}

export interface RsaJwk {
  kty: string;
  n?: string;
  e?: string;
  kid?: string;
  alg?: string;
}

export function verifyRs256(token: string, jwk: RsaJwk): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { alg?: string; kid?: string };
    if (header.alg !== "RS256") return false;
    if (jwk.kty !== "RSA" || !jwk.n || !jwk.e) return false;
    if (header.kid && jwk.kid && header.kid !== jwk.kid) return false;
    const key = createPublicKey({ key: jwk as unknown as import("node:crypto").JsonWebKey, format: "jwk" });
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();
    return verifier.verify(key, Buffer.from(parts[2], "base64url"));
  } catch {
    return false;
  }
}

export function emailFromClaims(claims: IdTokenClaims, issuer: string, clientId: string, nonce: string): { email: string; name: string; sub: string } | null {
  const now = Math.floor(Date.now() / 1000);
  if (!claims.exp || claims.exp < now) return null;
  if (claims.nonce !== nonce) return null;
  if (!claims.sub || typeof claims.sub !== "string") return null;
  const iss = (claims.iss ?? "").replace(/\/$/, "");
  if (iss !== issuer.replace(/\/$/, "")) return null;
  const aud = claims.aud;
  const audiences = Array.isArray(aud) ? aud : aud ? [aud] : [];
  if (!audiences.includes(clientId)) return null;
  if (claims.email_verified !== true && claims.email_verified !== "true") return null;
  const email = (claims.email ?? "").trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return null;
  const name = typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 80) : email;
  return { email, name, sub: claims.sub.slice(0, 180) };
}
