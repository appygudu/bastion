export const API_SCOPES = ["scans:read", "scans:write"] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export function workspaceLimits(plan: string) {
  if (plan === "team") return { apiKeys: 10, webhooks: 5, invites: 20, schedules: true };
  return { apiKeys: 2, webhooks: 1, invites: 2, schedules: false };
}

export function hasScope(scopes: string, required: ApiScope): boolean {
  return scopes.split(",").map((item) => item.trim()).includes(required);
}

const TX = /^[A-Za-z0-9-]{6,40}$/;
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function validPaymentClaim(input: { transactionId: string; payerEmail: string }): boolean {
  return TX.test(input.transactionId.trim()) && EMAIL.test(input.payerEmail.trim());
}
