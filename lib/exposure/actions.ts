export interface ActionItem {
  id: string;
  title: string;
  detail: string;
}

export const PERSONAL_ACTIONS: ActionItem[] = [
  { id: "rotate", title: "Rotate passwords", detail: "Change the password on every account that used the exposed address or a reused password. Start with email, banking, and cloud admin." },
  { id: "passkey", title: "Enable a passkey or 2FA", detail: "Prefer a passkey or an authenticator app. SMS is a weaker backup than an authenticator." },
  { id: "keys", title: "Revoke API keys and agent tokens", detail: "Delete unused keys in cloud, SaaS, and agent consoles. Issue a new key only where a job still needs one." },
  { id: "oauth", title: "Review OAuth app grants", detail: "Remove applications you do not recognize from Google, Microsoft, GitHub, and any other identity provider you use." },
  { id: "monitor", title: "Monitor the accounts", detail: "Turn on sign-in alerts and check recent sessions. A missing breach record is not proof the account is safe." },
];

export const ENTERPRISE_ACTIONS: ActionItem[] = [
  { id: "rotate", title: "Force password and session reset", detail: "Reset credentials for affected accounts and revoke active sessions in the identity provider. Do not ask people to send you their new password." },
  { id: "passkey", title: "Require passkeys or phishing-resistant MFA", detail: "Turn the control on for admins first, then for the rest of the workforce. Disable legacy protocols that skip MFA." },
  { id: "keys", title: "Revoke API keys and agent tokens", detail: "Rotate cloud keys, CI tokens, and agent credentials. Record the rotation in your existing change process." },
  { id: "oauth", title: "Review OAuth and SaaS grants", detail: "Remove unapproved enterprise applications and consent grants. Check admin-consent apps, not only each user's list." },
  { id: "monitor", title: "Monitor and tell the people affected", detail: "Watch identity and application logs. If a domain you operate is in a breach catalog, follow your notification duty. Open a Bastion scan only for a host you are authorized to assess." },
];
