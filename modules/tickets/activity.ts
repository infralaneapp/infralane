import type { Prisma } from "@prisma/client";

type TicketActivityInput = {
  ticketId: string;
  actorId?: string | null;
  type: Prisma.TicketActivityUncheckedCreateInput["type"];
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export async function createTicketActivity(tx: Prisma.TransactionClient, input: TicketActivityInput) {
  return tx.ticketActivity.create({
    data: {
      ticketId: input.ticketId,
      actorId: input.actorId ?? null,
      type: input.type,
      message: input.message,
      metadata: input.metadata,
    },
  });
}
