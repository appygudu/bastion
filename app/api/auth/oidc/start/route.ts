import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { oidcProviders, oidcRedirectUri } from "@/lib/auth/oidc";
import { sessionCookieOptions } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";
import { appOrigin } from "@/lib/public-env";
import { assertPublicHttpUrl, resolvePublicAddress } from "@/lib/security/ssrf";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const providerId = new URL(request.url).searchParams.get("provider");
  const provider = oidcProviders().find((item) => item.id === providerId);
  if (!provider) return jsonError("SSO is not configured on this deployment.", 404);
  let discovery: { authorization_endpoint?: string };
  try {
    const wellKnown = assertPublicHttpUrl(`${provider.issuer}/.well-known/openid-configuration`);
    await resolvePublicAddress(wellKnown.hostname);
    const response = await fetch(wellKnown, { redirect: "manual", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return jsonError("The identity provider discovery document did not load.", 502);
    discovery = await response.json() as { authorization_endpoint?: string };
  } catch {
    return jsonError("The identity provider could not be reached.", 502);
  }
  if (!discovery.authorization_endpoint) return jsonError("The identity provider did not publish an authorization endpoint.", 502);
  try {
    const authUrl = assertPublicHttpUrl(discovery.authorization_endpoint);
    await resolvePublicAddress(authUrl.hostname);
    const state = randomBytes(16).toString("base64url");
    const nonce = randomBytes(16).toString("base64url");
    const jar = await cookies();
    jar.set("oidc_txn", `${provider.id}.${state}.${nonce}`, { ...sessionCookieOptions(), maxAge: 600 });
    authUrl.searchParams.set("client_id", provider.clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("redirect_uri", oidcRedirectUri(appOrigin()));
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("nonce", nonce);
    return NextResponse.redirect(authUrl);
  } catch {
    return jsonError("The identity provider authorization endpoint was refused.", 502);
  }
}
