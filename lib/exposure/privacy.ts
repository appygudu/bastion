import { hashSecret } from "@/lib/security/secrets";

const EMAIL_IN_TEXT = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,63}/gi;

export { EXPOSURE_DISCLAIMER } from "@/lib/exposure/copy";

export function exposureRateKey(kind: "email-ip" | "email-target" | "domain" | "package" | "advisories" | "threats" | "password-range", material: string): string {
  return `exposure:${kind}:${hashSecret(material.trim().toLowerCase())}`;
}

export function redactText(value: string): string {
  return value.replace(EMAIL_IN_TEXT, "[redacted]");
}

export function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^https:\/\/[^\s]+$/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}
