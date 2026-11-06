import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodeIdTokenPayload, emailFromClaims, oidcProviders, oidcRedirectUri, verifyRs256, type RsaJwk } from "@/lib/auth/oidc";
import { hashPassword } from "@/lib/auth/password";
import { createSession, sessionCookieOptions } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { appOrigin } from "@/lib/public-env";
import { assertPublicHttpUrl, resolvePublicAddress } from "@/lib/security/ssrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const jar = await cookies();
  const txn = jar.get("oidc_txn")?.value ?? "";
  jar.set("oidc_txn", "", { ...sessionCookieOptions(), maxAge: 0 });
  const [providerId, expectedState, nonce] = txn.split(".");
  const provider = oidcProviders().find((item) => item.id === providerId);
  if (!provider || !code || !state || state !== expectedState || !nonce) {
    return NextResponse.redirect(`${appOrigin()}/login?error=sso`);
  }
  try {
    const wellKnown = assertPublicHttpUrl(`${provider.issuer}/.well-known/openid-configuration`);
    await resolvePublicAddress(wellKnown.hostname);
    const discoveryResponse = await fetch(wellKnown, { redirect: "manual", signal: AbortSignal.timeout(8000) });
    const discovery = await discoveryResponse.json() as { token_endpoint?: string; jwks_uri?: string };
    if (!discovery.token_endpoint || !discovery.jwks_uri) return NextResponse.redirect(`${appOrigin()}/login?error=sso`);
    const tokenUrl = assertPublicHttpUrl(discovery.token_endpoint);
    await resolvePublicAddress(tokenUrl.hostname);
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: oidcRedirectUri(appOrigin()),
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
    });
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    if (!tokenResponse.ok) return NextResponse.redirect(`${appOrigin()}/login?error=sso`);
    const token = await tokenResponse.json() as { id_token?: string };
    if (!token.id_token) return NextResponse.redirect(`${appOrigin()}/login?error=sso`);
    const jwksUrl = assertPublicHttpUrl(discovery.jwks_uri);
    await resolvePublicAddress(jwksUrl.hostname);
    const jwksResponse = await fetch(jwksUrl, { redirect: "manual", signal: AbortSignal.timeout(8000) });
    const jwks = await jwksResponse.json() as { keys?: RsaJwk[] };
    const header = JSON.parse(Buffer.from(token.id_token.split(".")[0] ?? "", "base64url").toString("utf8")) as { kid?: string };
    const jwk = (jwks.keys ?? []).find((key) => key.kty === "RSA" && (!header.kid || key.kid === header.kid));
    if (!jwk || !verifyRs256(token.id_token, jwk)) return NextResponse.redirect(`${appOrigin()}/login?error=sso`);
    const claims = decodeIdTokenPayload(token.id_token);
    if (!claims) return NextResponse.redirect(`${appOrigin()}/login?error=sso`);
    const identity = emailFromClaims(claims, provider.issuer, provider.clientId, nonce);
    if (!identity) return NextResponse.redirect(`${appOrigin()}/login?error=sso`);
    const subject = `${provider.id}:${identity.sub}`;
    let user = await prisma.user.findUnique({ where: { email: identity.email } });
    if (user?.isDemo) return NextResponse.redirect(`${appOrigin()}/login?error=sso`);
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: identity.email,
          name: identity.name,
          orgName: identity.name,
          passwordHash: await hashPassword(randomBytes(32).toString("hex")),
          oidcSubject: subject,
          plan: "free",
        },
      });
    } else if (!user.oidcSubject) {
      await prisma.user.update({ where: { id: user.id }, data: { oidcSubject: subject } });
    }
    await createSession(user.id);
    return NextResponse.redirect(`${appOrigin()}/app`);
  } catch {
    return NextResponse.redirect(`${appOrigin()}/login?error=sso`);
  }
}
