import { TicketActivityType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { isStaffRole } from "@/lib/auth/permissions";
import { createNotification } from "@/modules/notifications/service";
import type { TicketActor } from "@/modules/tickets/service";

export async function listApprovalRequests(
  filters: { status?: string },
  actor: TicketActor
) {
  if (!isStaffRole(actor.role)) {
    throw new AppError("Forbidden.", { status: 403, code: "FORBIDDEN" });
  }

  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;

  return prisma.approvalRequest.findMany({
    where,
    include: {
      ticket: { select: { id: true, sequence: true, title: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      job: { select: { id: true, status: true, rule: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getPendingCount(): Promise<number> {
  return prisma.approvalRequest.count({ where: { status: "PENDING" } });
}

export async function approveRequest(id: string, actor: TicketActor) {
  if (!isStaffRole(actor.role)) {
    throw new AppError("Forbidden.", { status: 403, code: "FORBIDDEN" });
  }

  const approval = await prisma.approvalRequest.findUnique({
    where: { id },
    include: { ticket: { select: { id: true, sequence: true } }, job: true },
  });

  if (!approval) {
    throw new AppError("Approval request not found.", { status: 404, code: "NOT_FOUND" });
  }

  if (approval.status !== "PENDING") {
    throw new AppError("Approval request is no longer pending.", { status: 400, code: "INVALID_STATUS" });
  }

  // Enforce designated approver if set
  if (approval.designatedApproverId && approval.designatedApproverId !== actor.id) {
    throw new AppError(
      "This approval is assigned to a specific approver. Only they can approve it.",
      { status: 403, code: "NOT_DESIGNATED_APPROVER" }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.approvalRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        approverId: actor.id,
        decidedAt: new Date(),
      },
    });

    // Transition linked job from PENDING_APPROVAL to QUEUED
    if (approval.jobId) {
      await tx.automationJob.update({
        where: { id: approval.jobId },
        data: { status: "QUEUED" },
      });
      await tx.automationJobEvent.create({
        data: {
          jobId: approval.jobId,
          event: "QUEUED",
          detail: `Approved by ${actor.id}`,
        },
      });
    }

    await tx.ticketActivity.create({
      data: {
        ticketId: approval.ticketId,
        actorId: actor.id,
        type: TicketActivityType.APPROVAL_APPROVED,
        message: "Approval granted.",
        metadata: { approvalRequestId: id },
      },
    });
  });

  // Notify requester
  createNotification({
    userId: approval.requestedById,
    title: "Approval granted",
    message: `Your request on INF-${approval.ticket.sequence} was approved.`,
    href: `/tickets/${approval.ticketId}`,
  }).catch(() => {});
}

export async function rejectRequest(id: string, actor: TicketActor, reason?: string) {
  if (!isStaffRole(actor.role)) {
    throw new AppError("Forbidden.", { status: 403, code: "FORBIDDEN" });
  }

  const approval = await prisma.approvalRequest.findUnique({
    where: { id },
    include: { ticket: { select: { id: true, sequence: true } }, job: true },
  });

  if (!approval) {
    throw new AppError("Approval request not found.", { status: 404, code: "NOT_FOUND" });
  }

  if (approval.status !== "PENDING") {
    throw new AppError("Approval request is no longer pending.", { status: 400, code: "INVALID_STATUS" });
  }

  // Enforce designated approver if set
  if (approval.designatedApproverId && approval.designatedApproverId !== actor.id) {
    throw new AppError(
      "This approval is assigned to a specific approver. Only they can decide it.",
      { status: 403, code: "NOT_DESIGNATED_APPROVER" }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.approvalRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        approverId: actor.id,
        decidedAt: new Date(),
        reason,
      },
    });

    // Skip the linked job
    if (approval.jobId) {
      await tx.automationJob.update({
        where: { id: approval.jobId },
        data: { status: "SKIPPED", completedAt: new Date() },
      });
      await tx.automationJobEvent.create({
        data: {
          jobId: approval.jobId,
          event: "SKIPPED",
          detail: `Rejected by ${actor.id}${reason ? `: ${reason}` : ""}`,
        },
      });
    }

    await tx.ticketActivity.create({
      data: {
        ticketId: approval.ticketId,
        actorId: actor.id,
        type: TicketActivityType.APPROVAL_REJECTED,
        message: reason ? `Approval rejected: ${reason}` : "Approval rejected.",
        metadata: { approvalRequestId: id },
      },
    });
  });

  createNotification({
    userId: approval.requestedById,
    title: "Approval rejected",
    message: `Your request on INF-${approval.ticket.sequence} was rejected.${reason ? ` Reason: ${reason}` : ""}`,
    href: `/tickets/${approval.ticketId}`,
  }).catch(() => {});
}

export async function expireStaleApprovals(): Promise<number> {
  const stale = await prisma.approvalRequest.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lte: new Date() },
    },
    select: { id: true, jobId: true, ticketId: true },
  });

  for (const approval of stale) {
    await prisma.$transaction(async (tx) => {
      await tx.approvalRequest.update({
        where: { id: approval.id },
        data: { status: "EXPIRED", decidedAt: new Date() },
      });

      if (approval.jobId) {
        await tx.automationJob.update({
          where: { id: approval.jobId },
          data: { status: "SKIPPED", completedAt: new Date() },
        });
      }
    });
  }

  return stale.length;
}
