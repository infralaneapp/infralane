import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { TicketFieldDefinition } from "@/modules/tickets/types";

export async function listTicketTypesAdmin() {
  return prisma.ticketType.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tickets: true } } },
  });
}

export async function createTicketType(input: {
  key: string;
  name: string;
  description?: string;
  fieldSchema: TicketFieldDefinition[];
}) {
  const existing = await prisma.ticketType.findUnique({ where: { key: input.key } });
  if (existing) {
    throw new AppError("A ticket type with this key already exists.", { status: 409, code: "DUPLICATE_KEY" });
  }

  return prisma.ticketType.create({
    data: {
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      fieldSchema: input.fieldSchema as any,
    },
  });
}

export async function updateTicketType(id: string, input: {
  name?: string;
  description?: string;
  fieldSchema?: TicketFieldDefinition[];
  archived?: boolean;
}) {
  const existing = await prisma.ticketType.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Ticket type not found.", { status: 404, code: "NOT_FOUND" });
  }

  return prisma.ticketType.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      fieldSchema: input.fieldSchema as any,
      archived: input.archived,
    },
  });
}

export async function deleteTicketType(id: string) {
  const existing = await prisma.ticketType.findUnique({
    where: { id },
    include: { _count: { select: { tickets: true } } },
  });

  if (!existing) {
    throw new AppError("Ticket type not found.", { status: 404, code: "NOT_FOUND" });
  }

  if (existing._count.tickets > 0) {
    throw new AppError("Cannot delete a ticket type that has existing tickets. Archive it instead.", {
      status: 400,
      code: "HAS_TICKETS",
    });
  }

  return prisma.ticketType.delete({ where: { id } });
}
