import { prisma } from "@/lib/db";
import { assertPublicHttpUrl } from "@/lib/security/ssrf";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim());
}

export async function sendWorkspaceEmail(to: string, subject: string, text: string): Promise<"sent" | "skipped" | "failed"> {
  const key = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.RESEND_FROM?.trim() ?? "";
  if (!key || !from) return "skipped";
  try {
    const url = assertPublicHttpUrl("https://api.resend.com/emails");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject: subject.slice(0, 180), text: text.slice(0, 4000) }),
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

export async function notifyWorkspace(
  workspaceId: string,
  input: { title: string; body: string; href?: string; email?: boolean },
) {
  const members = await prisma.membership.findMany({ where: { workspaceId }, select: { userId: true } });
  const userIds = [...new Set([workspaceId, ...members.map((member) => member.userId)])];
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title: input.title.slice(0, 140),
      body: input.body.slice(0, 500),
      href: input.href ?? "",
    })),
  });
  if (!input.email) return;
  const owner = await prisma.user.findUnique({ where: { id: workspaceId }, select: { email: true, plan: true } });
  if (!owner || owner.plan !== "team") return;
  await sendWorkspaceEmail(owner.email, input.title, input.body);
}

export async function notifyUser(userId: string, input: { title: string; body: string; href?: string; email?: boolean }) {
  await prisma.notification.create({
    data: {
      userId,
      title: input.title.slice(0, 140),
      body: input.body.slice(0, 500),
      href: input.href ?? "",
    },
  });
  if (!input.email) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, plan: true } });
  if (!user || user.plan !== "team") return;
  await sendWorkspaceEmail(user.email, input.title, input.body);
}
