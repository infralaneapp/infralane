import { prisma } from "@/lib/db";

export async function logSettingsChange(actorId: string, action: string, entity: string, entityId?: string, detail?: string) {
  return prisma.settingsAuditLog.create({
    data: { actorId, action, entity, entityId, detail },
  });
}
