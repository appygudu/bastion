export function paymentLink(): string | null {
  const raw = process.env.NEXT_PUBLIC_PAYMENT_LINK_URL?.trim() ?? "";
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function enterpriseContact(): { kind: "email" | "url"; value: string } | null {
  const raw = process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT?.trim() ?? "";
  if (!raw) return null;
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(raw)) return { kind: "email", value: raw };
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" && !url.username && !url.password) return { kind: "url", value: url.toString() };
  } catch {
    return null;
  }
  return null;
}

export function securityContact(): string | null {
  const raw = process.env.NEXT_PUBLIC_SECURITY_CONTACT?.trim() ?? "";
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(raw) ? raw : null;
}

export function appOrigin(): string {
  const raw = process.env.APP_URL?.trim() ?? "";
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
  } catch {
    // Fall through to the known deployment origin.
  }
  return "https://bastion-cyber-defense.vercel.app";
}
