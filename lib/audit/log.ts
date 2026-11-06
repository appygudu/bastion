import { prisma } from "@/lib/db";

export async function audit(workspaceId: string, actorId: string, action: string, target: string) {
  await prisma.auditEvent.create({
    data: {
      workspaceId,
      actorId,
      action: action.slice(0, 80),
      target: target.slice(0, 300),
    },
  });
}
