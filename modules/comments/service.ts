import { TicketActivityType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { isStaffRole } from "@/lib/auth/permissions";
import { createTicketActivity } from "@/modules/tickets/activity";
import { formatTicketReference, serializeUser, userSelect } from "@/modules/tickets/serializers";
import type { TicketActor } from "@/modules/tickets/service";
import type { CreateCommentInput } from "@/modules/comments/schemas";
import { notifyComment } from "@/modules/notifications/service";

export async function addTicketComment(ticketId: string, input: CreateCommentInput, actor: TicketActor) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      ...(isStaffRole(actor.role)
        ? {}
        : {
            requesterId: actor.id,
          }),
    },
    select: {
      id: true,
      sequence: true,
      requesterId: true,
      assigneeId: true,
    },
  });

  if (!ticket) {
    throw new AppError("Ticket not found.", {
      status: 404,
      code: "TICKET_NOT_FOUND",
    });
  }

  const comment = await prisma.$transaction(async (tx) => {
    const createdComment = await tx.ticketComment.create({
      data: {
        ticketId,
        authorId: actor.id,
        content: input.content.trim(),
      },
      include: {
        author: {
          select: userSelect,
        },
      },
    });

    await createTicketActivity(tx, {
      ticketId,
      actorId: actor.id,
      type: TicketActivityType.COMMENTED,
      message: "Comment added to ticket.",
      metadata: {
        commentId: createdComment.id,
      },
    });

    return createdComment;
  });

  // Send notifications (fire and forget)
  const ref = formatTicketReference(ticket.sequence);
  const authorName = comment.author.name;

  // Notify ticket participants (requester + assignee) except the commenter
  const recipientIds = new Set<string>();
  if (ticket.requesterId !== actor.id) recipientIds.add(ticket.requesterId);
  if (ticket.assigneeId && ticket.assigneeId !== actor.id) recipientIds.add(ticket.assigneeId);

  // Parse @mentions — match @Name or @"Full Name"
  const mentionPattern = /@"([^"]+)"|@(\S+)/g;
  const mentionNames: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = mentionPattern.exec(input.content)) !== null) {
    mentionNames.push(match[1] ?? match[2]);
  }

  if (mentionNames.length > 0) {
    const mentionedUsers = await prisma.user.findMany({
      where: {
        OR: mentionNames.map((name) => ({
          name: { equals: name, mode: "insensitive" as const },
        })),
      },
      select: { id: true },
    });
    for (const u of mentionedUsers) {
      if (u.id !== actor.id) recipientIds.add(u.id);
    }
  }

  for (const recipientId of recipientIds) {
    notifyComment(ticketId, ref, recipientId, authorName).catch(() => {});
  }

  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: serializeUser(comment.author)!,
  };
}
