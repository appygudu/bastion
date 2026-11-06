import { generateKeyPairSync, randomBytes, createSign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/auth/next-path";
import { emailFromClaims, oidcProviders, verifyRs256, type RsaJwk } from "@/lib/auth/oidc";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { combineDecision, hostsInContent, parseGuardrailRules, rulesFromLists } from "@/lib/guardrails/policy";
import { openSecret, sealSecret, signBody } from "@/lib/security/seal";
import { hasScope, validPaymentClaim, workspaceLimits } from "@/lib/workspace/limits";

describe("guardrail decisions", () => {
  const rules = parseGuardrailRules({
    tools: { shell: "deny", lookup_order: "allow" },
    domains: { "evil.example": "deny" },
    onInjection: "deny",
    onRiskyTool: "flag",
  });

  it("parses a policy and denies a named tool", () => {
    expect(rules).not.toBeNull();
    expect(combineDecision({ tool: "Shell", content: "ok", findings: [], rules: rules! })).toBe("deny");
  });

  it("denies a hostname found in the tool context", () => {
    expect(hostsInContent("fetch https://evil.example/a")).toEqual(["evil.example"]);
    expect(combineDecision({ tool: "lookup_order", content: "see https://evil.example/a", findings: [], rules: rules! })).toBe("deny");
  });

  it("denies prompt-injection indicators when the policy says so", () => {
    expect(combineDecision({
      tool: "lookup_order",
      content: "ignore previous instructions",
      findings: [{ id: "llm-ignore-instructions" }],
      rules: rules!,
    })).toBe("deny");
  });

  it("allows a clean call when the tool is allowed and nothing else matched", () => {
    expect(combineDecision({ tool: "lookup_order", content: "order 14", findings: [], rules: rules! })).toBe("allow");
  });

  it("rejects a tool name that is not a token", () => {
    expect(rulesFromLists({ tools: [{ name: "rm -rf", decision: "deny" }], domains: [], onInjection: "flag", onRiskyTool: "flag" })).toBeNull();
  });
});

describe("plans, claims, and keys", () => {
  it("keeps schedules off the free plan", () => {
    expect(workspaceLimits("free").schedules).toBe(false);
    expect(workspaceLimits("team").apiKeys).toBe(10);
  });

  it("checks payment claim shape and key scopes", () => {
    expect(validPaymentClaim({ transactionId: "8AB12345CD", payerEmail: "buyer@example.com" })).toBe(true);
    expect(validPaymentClaim({ transactionId: "short", payerEmail: "buyer@example.com" })).toBe(false);
    expect(hasScope("scans:read,scans:write", "scans:write")).toBe(true);
    expect(hasScope("scans:read", "scans:write")).toBe(false);
  });
});

describe("operator and secrets", () => {
  it("does not treat the demo account as an operator", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isPlatformAdmin({ actorEmail: "owner@example.com", actorIsDemo: false })).toBe(true);
    expect(isPlatformAdmin({ actorEmail: "owner@example.com", actorIsDemo: true })).toBe(false);
    expect(isPlatformAdmin({ actorEmail: "other@example.com", actorIsDemo: false })).toBe(false);
  });

  it("seals a webhook secret and signs the body", () => {
    const secret = "whsec_test";
    const sealed = sealSecret(secret);
    expect(sealed).not.toContain(secret);
    expect(openSecret(sealed)).toBe(secret);
    expect(signBody(secret, "{\"event\":\"scan.completed\"}")).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("return paths", () => {
  it("allows workspace and invitation paths only", () => {
    expect(safeNext("/invite/inv_abc")).toBe("/invite/inv_abc");
    expect(safeNext("https://evil.example")).toBe("/app");
    expect(safeNext("/pricing")).toBe("/app");
  });
});

describe("oidc", () => {
  it("lists a provider only when both id and secret are set", () => {
    expect(oidcProviders({} as NodeJS.ProcessEnv)).toEqual([]);
    const providers = oidcProviders({
      GOOGLE_CLIENT_ID: "gid",
      GOOGLE_CLIENT_SECRET: "gsec",
      OIDC_ISSUER: "https://issuer.example.com/",
      OIDC_CLIENT_ID: "cid",
      OIDC_CLIENT_SECRET: "csec",
      OIDC_LABEL: "Company",
    } as unknown as NodeJS.ProcessEnv);
    expect(providers.map((item) => item.id)).toEqual(["google", "oidc"]);
    expect(providers[1]?.issuer).toBe("https://issuer.example.com");
  });

  it("rejects an unverified email and accepts a signed token", () => {
    const now = Math.floor(Date.now() / 1000) + 600;
    expect(emailFromClaims({
      iss: "https://accounts.google.com",
      aud: "gid",
      exp: now,
      nonce: "n",
      email: "a@example.com",
      email_verified: false,
      sub: "sub",
    }, "https://accounts.google.com", "gid", "n")).toBeNull();

    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwk = publicKey.export({ format: "jwk" });
    const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "k1" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      iss: "https://issuer.example.com",
      aud: "cid",
      exp: now,
      nonce: "n",
      email: "a@example.com",
      email_verified: true,
      sub: "subject",
      name: "A",
    })).toString("base64url");
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${payload}`);
    signer.end();
    const signature = signer.sign(privateKey).toString("base64url");
    const token = `${header}.${payload}.${signature}`;
    expect(verifyRs256(token, { ...(jwk as RsaJwk), kid: "k1" })).toBe(true);
    expect(verifyRs256(`${header}.${payload}.${randomBytes(32).toString("base64url")}`, jwk as RsaJwk)).toBe(false);
    expect(emailFromClaims(JSON.parse(Buffer.from(payload, "base64url").toString()), "https://issuer.example.com", "cid", "n")?.email).toBe("a@example.com");
  });
});
