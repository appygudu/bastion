import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/security/origin";

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: jsonError("Sign in required.", 401) };
  return { user, error: null };
}

export function crossOriginDenied(request: Request) {
  if (sameOrigin(request)) return null;
  return jsonError("Cross-site request refused.", 403);
}

export function demoDenied(user: { isDemo: boolean }) {
  if (!user.isDemo) return null;
  return jsonError("The demo workspace is read-only. It cannot scan hosts, create properties, change policies, review new manifests, or append ledger events.", 403);
}

export function viewerDenied(user: { role: string }) {
  if (user.role !== "viewer") return null;
  return jsonError("Viewers can read this workspace. Ask an owner or admin to make this change.", 403);
}

export function ownerDenied(user: { role: string }) {
  if (user.role === "owner") return null;
  return jsonError("Only the workspace owner can do this.", 403);
}

export function clientKey(request: Request, fallback: string) {
  const vercel = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return fallback;
  const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
  return parts[0] || fallback;
}
