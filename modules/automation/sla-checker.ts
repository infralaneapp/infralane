import { prisma } from "@/lib/db";
import { emitTrigger } from "@/modules/automation/triggers";
import { getSlaThresholds } from "@/lib/sla";

const STALE_WAITING_DAYS = 3;
const RESOLVED_EXPIRY_DAYS = 7;

/**
 * Check for SLA breaches, stale waiting tickets, and resolved expiry.
 * Deduplication is handled by dedupKey in the trigger system.
 */
export async function checkSlaBreaches(): Promise<number> {
  const now = Date.now();
  let triggerCount = 0;
  const SLA_THRESHOLDS = await getSlaThresholds();

  // 1. SLA breach check
  const activeTickets = await prisma.ticket.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER"] },
    },
    select: {
      id: true,
      priority: true,
      createdAt: true,
      firstResponseAt: true,
      resolvedAt: true,
    },
  });

  for (const ticket of activeTickets) {
    const thresholds = SLA_THRESHOLDS[ticket.priority];
    if (!thresholds) continue;

    const ageMs = now - ticket.createdAt.getTime();
    const responseBreached = !ticket.firstResponseAt && ageMs > thresholds.responseHours * 3600000;
    const resolutionBreached = !ticket.resolvedAt && ageMs > thresholds.resolutionHours * 3600000;

    if (responseBreached || resolutionBreached) {
      await emitTrigger("SLA_BREACHED", ticket.id, {
        responseBreached,
        resolutionBreached,
        priority: ticket.priority,
      });
      triggerCount++;
    }
  }

  // 2. Stale waiting check: WAITING_FOR_REQUESTER > N days
  const staleThreshold = new Date(now - STALE_WAITING_DAYS * 24 * 60 * 60 * 1000);
  const staleTickets = await prisma.ticket.findMany({
    where: {
      status: "WAITING_FOR_REQUESTER",
      updatedAt: { lte: staleThreshold },
    },
    select: { id: true },
  });

  for (const ticket of staleTickets) {
    await emitTrigger("STALE_WAITING", ticket.id, {
      staleDays: STALE_WAITING_DAYS,
    });
    triggerCount++;
  }

  // 3. Resolved expiry check: RESOLVED > N days → auto-close candidates
  const expiryThreshold = new Date(now - RESOLVED_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const expiredTickets = await prisma.ticket.findMany({
    where: {
      status: "RESOLVED",
      resolvedAt: { lte: expiryThreshold },
    },
    select: { id: true },
  });

  for (const ticket of expiredTickets) {
    await emitTrigger("RESOLVED_EXPIRED", ticket.id, {
      expiryDays: RESOLVED_EXPIRY_DAYS,
    });
    triggerCount++;
  }

  return triggerCount;
}
