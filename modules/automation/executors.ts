import { TicketActivityType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { createNotification, notifyAssignment, notifyStatusChange } from "@/modules/notifications/service";
import { formatTicketReference } from "@/modules/tickets/serializers";

export type ExecutorParams = {
  ticketId: string;
  actionValue: string;
  ruleId: string;
  ruleName: string;
};

export type ExecutorResult = {
  success: boolean;
  detail?: string;
};

function automationMeta(ruleId: string, ruleName: string) {
  return { automated: true, ruleId, ruleName };
}

async function getTicketWithRef(ticketId: string) {
  const t = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, sequence: true, status: true, priority: true, assigneeId: true, requesterId: true },
  });
  if (!t) throw new Error(`Ticket ${ticketId} not found`);
  return { ...t, reference: formatTicketReference(t.sequence) };
}

async function assignTo(params: ExecutorParams): Promise<ExecutorResult> {
  const ticket = await getTicketWithRef(params.ticketId);

  if (ticket.assigneeId === params.actionValue) {
    return { success: true, detail: "Already assigned to target" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: params.ticketId },
      data: { assigneeId: params.actionValue },
    });
    await tx.ticketActivity.create({
      data: {
        ticketId: params.ticketId,
        actorId: null,
        type: TicketActivityType.ASSIGNED,
        message: `Auto-assigned by rule "${params.ruleName}".`,
        metadata: automationMeta(params.ruleId, params.ruleName),
      },
    });
  });

  notifyAssignment(params.ticketId, ticket.reference, params.actionValue).catch(() => {});

  return { success: true, detail: `Assigned to ${params.actionValue}` };
}

async function changeStatus(params: ExecutorParams): Promise<ExecutorResult> {
  const ticket = await getTicketWithRef(params.ticketId);
  const newStatus = params.actionValue;

  const validStatuses = ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED"];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, detail: `Invalid status: ${newStatus}` };
  }

  if (ticket.status === newStatus) {
    return { success: true, detail: "Already at target status" };
  }

  // SLA timestamp logic (replicated from service.ts)
  const slaData: Record<string, Date | null> = {};
  if (ticket.status === "OPEN" && newStatus !== "OPEN") {
    slaData.firstResponseAt = new Date();
  }
  if (newStatus === "RESOLVED") {
    slaData.resolvedAt = new Date();
  }
  if (newStatus === "CLOSED") {
    slaData.closedAt = new Date();
  }
  if (newStatus === "OPEN" || newStatus === "IN_PROGRESS") {
    slaData.resolvedAt = null;
    slaData.closedAt = null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: params.ticketId },
      data: { status: newStatus as any, ...slaData },
    });
    await tx.ticketActivity.create({
      data: {
        ticketId: params.ticketId,
        actorId: null,
        type: TicketActivityType.STATUS_CHANGED,
        message: `Status auto-changed to ${newStatus} by rule "${params.ruleName}".`,
        metadata: { ...automationMeta(params.ruleId, params.ruleName), previousStatus: ticket.status, nextStatus: newStatus },
      },
    });
  });

  notifyStatusChange(params.ticketId, ticket.reference, ticket.requesterId, newStatus).catch(() => {});

  return { success: true, detail: `Status changed to ${newStatus}` };
}

async function changePriority(params: ExecutorParams): Promise<ExecutorResult> {
  const ticket = await getTicketWithRef(params.ticketId);

  const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  if (!validPriorities.includes(params.actionValue)) {
    return { success: false, detail: `Invalid priority: ${params.actionValue}` };
  }

  if (ticket.priority === params.actionValue) {
    return { success: true, detail: "Already at target priority" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: params.ticketId },
      data: { priority: params.actionValue as any },
    });
    await tx.ticketActivity.create({
      data: {
        ticketId: params.ticketId,
        actorId: null,
        type: TicketActivityType.UPDATED,
        message: `Priority auto-changed to ${params.actionValue} by rule "${params.ruleName}".`,
        metadata: { ...automationMeta(params.ruleId, params.ruleName), changedFields: ["priority"] },
      },
    });
  });

  return { success: true, detail: `Priority changed to ${params.actionValue}` };
}

async function addTag(params: ExecutorParams): Promise<ExecutorResult> {
  let tag = await prisma.tag.findUnique({ where: { name: params.actionValue } });

  if (!tag) {
    tag = await prisma.tag.create({ data: { name: params.actionValue } });
  }

  await prisma.ticketTag.upsert({
    where: { ticketId_tagId: { ticketId: params.ticketId, tagId: tag.id } },
    create: { ticketId: params.ticketId, tagId: tag.id },
    update: {},
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: params.ticketId,
      actorId: null,
      type: TicketActivityType.UPDATED,
      message: `Tag "${params.actionValue}" auto-added by rule "${params.ruleName}".`,
      metadata: automationMeta(params.ruleId, params.ruleName),
    },
  });

  return { success: true, detail: `Tag "${params.actionValue}" added` };
}

async function notify(params: ExecutorParams): Promise<ExecutorResult> {
  const ticket = await getTicketWithRef(params.ticketId);

  let targetUserId = params.actionValue;

  // Resolve special targets
  if (targetUserId === "requester") {
    targetUserId = ticket.requesterId;
  } else if (targetUserId === "assignee") {
    if (!ticket.assigneeId) {
      return { success: true, detail: "No assignee to notify" };
    }
    targetUserId = ticket.assigneeId;
  }

  await createNotification({
    userId: targetUserId,
    title: `Automation: ${params.ruleName}`,
    message: `Rule triggered on ${ticket.reference}.`,
    href: `/tickets/${params.ticketId}`,
  });

  return { success: true, detail: `Notified ${targetUserId}` };
}

async function slackNotify(params: ExecutorParams): Promise<ExecutorResult> {
  const integrationConfig = await prisma.integrationConfig.findUnique({
    where: { provider: "slack" },
  });

  if (!integrationConfig?.enabled) {
    return { success: false, detail: "Slack integration not configured or disabled" };
  }

  const { slackAdapter } = await import("@/modules/automation/adapters/slack");
  const ticket = await getTicketWithRef(params.ticketId);

  const result = await slackAdapter.execute({
    ticketId: params.ticketId,
    ticketRef: ticket.reference,
    actionValue: params.actionValue,
    config: integrationConfig.config as Record<string, unknown>,
    ruleId: params.ruleId,
    ruleName: params.ruleName,
  });

  return { success: result.success, detail: result.detail };
}

async function webhook(params: ExecutorParams): Promise<ExecutorResult> {
  const { executeWebhook } = await import("@/modules/automation/adapters/webhook");
  const ticket = await getTicketWithRef(params.ticketId);

  // Load ticket fields for template rendering
  const fields = await prisma.ticketField.findMany({
    where: { ticketId: params.ticketId },
    select: { key: true, value: true },
  });
  const fieldMap = Object.fromEntries(fields.map((f) => [f.key, f.value]));

  const result = await executeWebhook(params.actionValue, {
    ticketId: params.ticketId,
    ticketRef: ticket.reference,
    fields: fieldMap,
  });

  return { success: result.success, detail: result.detail };
}

async function escalate(params: ExecutorParams): Promise<ExecutorResult> {
  const policy = await prisma.escalationPolicy.findUnique({
    where: { id: params.actionValue },
  });

  if (!policy || !policy.enabled) {
    return { success: false, detail: "Escalation policy not found or disabled" };
  }

  const steps = policy.steps as Array<{ delayMinutes: number; action: string; targetUserId: string }>;
  const ticket = await getTicketWithRef(params.ticketId);

  for (const step of steps) {
    if (step.delayMinutes === 0) {
      await createNotification({
        userId: step.targetUserId,
        title: `Escalation: ${params.ruleName}`,
        message: `${ticket.reference} has been escalated to you.`,
        href: `/tickets/${params.ticketId}`,
      });
    } else {
      await prisma.automationJob.create({
        data: {
          ruleId: params.ruleId,
          ticketId: params.ticketId,
          trigger: "SLA_BREACHED",
          status: "QUEUED",
          nextRunAt: new Date(Date.now() + step.delayMinutes * 60 * 1000),
          dedupKey: `escalation-${params.ruleId}-${params.ticketId}-${step.delayMinutes}`,
          actionPayload: {
            action: "NOTIFY",
            actionValue: step.targetUserId,
            ruleName: `${params.ruleName} (step +${step.delayMinutes}m)`,
          },
        },
      });
    }
  }

  return { success: true, detail: `Escalation started: ${steps.length} steps` };
}

const executors: Record<string, (params: ExecutorParams) => Promise<ExecutorResult>> = {
  ASSIGN_TO: assignTo,
  CHANGE_STATUS: changeStatus,
  CHANGE_PRIORITY: changePriority,
  ADD_TAG: addTag,
  NOTIFY: notify,
  SLACK_NOTIFY: slackNotify,
  WEBHOOK: webhook,
  ESCALATE: escalate,
};

export async function executeAction(
  action: string,
  params: ExecutorParams
): Promise<ExecutorResult> {
  const executor = executors[action];
  if (!executor) {
    return { success: false, detail: `Unknown action: ${action}` };
  }
  return executor(params);
}
