import { TicketActivityType, type AutomationTrigger } from "@prisma/client";

import { prisma } from "@/lib/db";
import { evaluateConditions } from "@/modules/automation/conditions";
import { computeDedupKey } from "@/modules/automation/dedup";
import { createNotification } from "@/modules/notifications/service";

/** Triggers that should only fire once per rule+ticket (first occurrence). */
const ONE_SHOT_TRIGGERS: Set<string> = new Set(["TICKET_CREATED"]);

/**
 * After a ticket mutation, find matching enabled rules, evaluate conditions,
 * and create AutomationJob records for execution by the worker.
 *
 * @param trigger - The automation trigger type
 * @param ticketId - The ticket that triggered the event
 * @param context - Optional context about why this trigger fired (e.g. { previousStatus, newStatus })
 */
export async function emitTrigger(
  trigger: AutomationTrigger,
  ticketId: string,
  context?: Record<string, unknown>
): Promise<void> {
  const rules = await prisma.automationRule.findMany({
    where: { trigger, enabled: true },
  });

  if (rules.length === 0) return;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      ticketType: { select: { key: true } },
      tags: { include: { tag: { select: { name: true } } } },
      fields: { select: { key: true, value: true } },
    },
  });

  if (!ticket) return;

  const snapshot = {
    priority: ticket.priority,
    status: ticket.status,
    assigneeId: ticket.assigneeId,
    ticketType: ticket.ticketType,
    tags: ticket.tags,
    fields: ticket.fields,
  };

  for (const rule of rules) {
    const conditions = (rule.conditions as Record<string, string>) ?? {};

    const matched = evaluateConditions(conditions, snapshot);

    if (!matched) {
      // Persist non-match evaluation for metrics
      prisma.automationRuleEvaluation.create({
        data: { ruleId: rule.id, ticketId, trigger, matched: false },
      }).catch((e) => console.error("[automation] eval log failed:", e));
      continue;
    }

    const dedupKey = computeDedupKey(rule.id, ticketId, trigger, context);
    const isOneShot = ONE_SHOT_TRIGGERS.has(trigger);

    // Dedup check using the unique index on (ruleId, dedupKey)
    const existing = await prisma.automationJob.findFirst({
      where: { ruleId: rule.id, dedupKey },
    });

    const dedupSkipped =
      (isOneShot && existing && ["SUCCEEDED", "QUEUED", "RUNNING", "PENDING_APPROVAL"].includes(existing.status)) ||
      (!isOneShot && existing && ["QUEUED", "RUNNING", "PENDING_APPROVAL"].includes(existing.status));

    // Persist evaluation for metrics
    prisma.automationRuleEvaluation.create({
      data: { ruleId: rule.id, ticketId, trigger, matched: true, dedupSkipped: !!dedupSkipped },
    }).catch((e) => console.error("[automation] eval log failed:", e));

    if (dedupSkipped) {
      continue;
    }

    const needsApproval = rule.requiresApproval;
    const jobStatus = needsApproval ? "PENDING_APPROVAL" : "QUEUED";

    // Use try/catch to handle race condition — if two concurrent emissions
    // both pass the dedup check, the unique constraint on (ruleId, dedupKey)
    // ensures only one succeeds. The loser gets P2002 and is silently skipped.
    let job;
    try {
      job = await prisma.automationJob.create({
        data: {
          ruleId: rule.id,
          ticketId,
          trigger,
          status: jobStatus,
          dedupKey,
          triggerContext: context ? (context as any) : undefined,
          actionPayload: {
            action: rule.action,
            actionValue: rule.actionValue,
            ruleName: rule.name,
          },
          events: {
            create: {
              event: jobStatus,
              detail: context
                ? `Trigger: ${trigger}, context: ${JSON.stringify(context)}`
                : `Trigger: ${trigger}`,
            },
          },
        },
      });
    } catch (err: any) {
      // P2002 = unique constraint violation (race condition dedup)
      if (err?.code === "P2002") continue;
      throw err;
    }

    // Create approval request if rule requires approval
    if (needsApproval) {
      await prisma.approvalRequest.create({
        data: {
          ticketId,
          jobId: job.id,
          requestedById: ticket.requesterId,
          designatedApproverId: rule.approverUserId ?? null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      await prisma.ticketActivity.create({
        data: {
          ticketId,
          actorId: null,
          type: TicketActivityType.APPROVAL_REQUESTED,
          message: `Approval required for automation rule "${rule.name}".`,
          metadata: { automated: true, ruleId: rule.id, ruleName: rule.name },
        },
      });

      // Notify the designated approver or all admins
      if (rule.approverUserId) {
        createNotification({
          userId: rule.approverUserId,
          title: "Approval required",
          message: `Rule "${rule.name}" triggered on INF-${ticket.sequence}. Your approval is needed.`,
          href: `/approvals`,
        }).catch(() => {});
      }
    }
  }
}
