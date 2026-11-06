import { crossOriginDenied } from "@/lib/api";
import { destroySession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const origin = crossOriginDenied(request);
  if (origin) return origin;
  await destroySession();
  return Response.json({ ok: true });
}
