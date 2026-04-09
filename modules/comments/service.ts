import { TicketActivityType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createTicketActivity } from "@/modules/tickets/activity";
import { serializeUser, userSelect } from "@/modules/tickets/serializers";
import type { TicketActor } from "@/modules/tickets/service";
import type { CreateCommentInput } from "@/modules/comments/schemas";

export async function addTicketComment(ticketId: string, input: CreateCommentInput, actor: TicketActor) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      ...(actor.role === "DEVOPS"
        ? {}
        : {
            requesterId: actor.id,
          }),
    },
    select: {
      id: true,
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

  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: serializeUser(comment.author)!,
  };
}
