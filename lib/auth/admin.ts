import type { SessionUser } from "@/lib/auth/session";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdmin(user: Pick<SessionUser, "actorEmail" | "actorIsDemo">): boolean {
  if (user.actorIsDemo) return false;
  return adminEmails().includes(user.actorEmail.toLowerCase());
}
