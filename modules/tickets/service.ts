import { TicketActivityType, UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createTicketActivity } from "@/modules/tickets/activity";
import { normalizeTicketFields, parseTicketFieldSchema, validateTicketFields } from "@/modules/tickets/field-schema";
import {
  serializeTicketDetail,
  serializeTicketSummary,
  serializeTicketType,
  serializeUser,
  ticketDetailArgs,
  ticketSummaryArgs,
  userSelect,
} from "@/modules/tickets/serializers";
import type {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsFilterInput,
  UpdateTicketInput,
  UpdateTicketStatusInput,
} from "@/modules/tickets/schemas";

export type TicketActor = {
  id: string;
  role: UserRole;
};

function isDevops(actor: TicketActor) {
  return actor.role === UserRole.DEVOPS;
}

function buildTicketVisibilityWhere(actor: TicketActor) {
  return isDevops(actor)
    ? {}
    : {
        requesterId: actor.id,
      };
}

function assertDevops(actor: TicketActor, message: string) {
  if (!isDevops(actor)) {
    throw new AppError(message, {
      status: 403,
      code: "FORBIDDEN",
    });
  }
}

async function getTicketRecord(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    ...ticketDetailArgs,
  });
}

async function getAccessibleTicket(id: string, actor: TicketActor) {
  return prisma.ticket.findFirst({
    where: {
      id,
      ...buildTicketVisibilityWhere(actor),
    },
    ...ticketDetailArgs,
  });
}

export async function listAssignableUsers(actor?: TicketActor) {
  if (actor && !isDevops(actor)) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      role: UserRole.DEVOPS,
    },
    orderBy: {
      name: "asc",
    },
    select: userSelect,
  });

  return users.map((user) => serializeUser(user)!);
}

export async function listTicketTypes() {
  const ticketTypes = await prisma.ticketType.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return ticketTypes.map(serializeTicketType);
}

export async function listTickets(filters: ListTicketsFilterInput = {}, actor: TicketActor) {
  const tickets = await prisma.ticket.findMany({
    where: {
      ...buildTicketVisibilityWhere(actor),
      status: filters.status,
      ticketType: filters.type
        ? {
            key: filters.type,
          }
        : undefined,
      assigneeId: filters.assigneeId === "unassigned" ? null : filters.assigneeId,
    },
    orderBy: {
      createdAt: "desc",
    },
    ...ticketSummaryArgs,
  });

  return tickets.map(serializeTicketSummary);
}

export async function getTicketById(id: string, actor: TicketActor) {
  const ticket = await getAccessibleTicket(id, actor);
  return ticket ? serializeTicketDetail(ticket) : null;
}

export async function createTicket(input: CreateTicketInput, actorId: string) {
  const ticketType = await prisma.ticketType.findUnique({
    where: {
      key: input.ticketTypeKey,
    },
  });

  if (!ticketType) {
    throw new AppError("Ticket type was not found.", {
      status: 404,
      code: "TICKET_TYPE_NOT_FOUND",
    });
  }

  const structuredFields = normalizeTicketFields(input.fields);
  validateTicketFields(parseTicketFieldSchema(ticketType.fieldSchema), structuredFields);

  const ticket = await prisma.$transaction(async (tx) => {
    const createdTicket = await tx.ticket.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        requesterId: actorId,
        ticketTypeId: ticketType.id,
        fields: structuredFields.length
          ? {
              create: structuredFields,
            }
          : undefined,
      },
      ...ticketDetailArgs,
    });

    await createTicketActivity(tx, {
      ticketId: createdTicket.id,
      actorId,
      type: TicketActivityType.CREATED,
      message: `Ticket created as ${ticketType.name}.`,
      metadata: {
        ticketTypeKey: ticketType.key,
      },
    });

    return tx.ticket.findUniqueOrThrow({
      where: { id: createdTicket.id },
      ...ticketDetailArgs,
    });
  });

  return serializeTicketDetail(ticket);
}

export async function updateTicket(id: string, input: UpdateTicketInput, actor: TicketActor) {
  assertDevops(actor, "Only DevOps engineers can update ticket details.");

  const existingTicket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      ticketType: true,
    },
  });

  if (!existingTicket) {
    throw new AppError("Ticket not found.", {
      status: 404,
      code: "TICKET_NOT_FOUND",
    });
  }

  const structuredFields = input.fields ? normalizeTicketFields(input.fields) : undefined;

  if (structuredFields) {
    validateTicketFields(parseTicketFieldSchema(existingTicket.ticketType.fieldSchema), structuredFields);
  }

  const changedFields = [
    input.title !== undefined ? "title" : null,
    input.description !== undefined ? "description" : null,
    structuredFields ? "structured_fields" : null,
  ].filter(Boolean);

  const ticket = await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id },
      data: {
        title: input.title?.trim(),
        description:
          input.description === undefined ? undefined : input.description?.trim() || null,
        fields: structuredFields
          ? {
              deleteMany: {},
              create: structuredFields,
            }
          : undefined,
      },
      ...ticketDetailArgs,
    });

    await createTicketActivity(tx, {
      ticketId: id,
      actorId: actor.id,
      type: TicketActivityType.UPDATED,
      message: "Ticket details updated.",
      metadata: {
        changedFields,
      },
    });

    return tx.ticket.findUniqueOrThrow({
      where: { id },
      ...ticketDetailArgs,
    });
  });

  return serializeTicketDetail(ticket);
}

export async function assignTicket(id: string, input: AssignTicketInput, actor: TicketActor) {
  assertDevops(actor, "Only DevOps engineers can assign tickets.");

  const existingTicket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignee: {
        select: userSelect,
      },
    },
  });

  if (!existingTicket) {
    throw new AppError("Ticket not found.", {
      status: 404,
      code: "TICKET_NOT_FOUND",
    });
  }

  if (existingTicket.assigneeId === input.assigneeId) {
    const currentTicket = await getTicketRecord(id);
    return serializeTicketDetail(currentTicket!);
  }

  let assigneeName = "Unassigned";

  if (input.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: input.assigneeId,
        role: UserRole.DEVOPS,
      },
      select: userSelect,
    });

    if (!assignee) {
      throw new AppError("Assignee was not found.", {
        status: 404,
        code: "ASSIGNEE_NOT_FOUND",
      });
    }

    assigneeName = assignee.name;
  }

  const ticket = await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id },
      data: {
        assigneeId: input.assigneeId,
      },
      ...ticketDetailArgs,
    });

    await createTicketActivity(tx, {
      ticketId: id,
      actorId: actor.id,
      type: TicketActivityType.ASSIGNED,
      message: input.assigneeId ? `Assigned ticket to ${assigneeName}.` : "Cleared ticket assignee.",
      metadata: {
        assigneeId: input.assigneeId,
      },
    });

    return tx.ticket.findUniqueOrThrow({
      where: { id },
      ...ticketDetailArgs,
    });
  });

  return serializeTicketDetail(ticket);
}

export async function updateTicketStatus(id: string, input: UpdateTicketStatusInput, actor: TicketActor) {
  assertDevops(actor, "Only DevOps engineers can change ticket status.");

  const existingTicket = await prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existingTicket) {
    throw new AppError("Ticket not found.", {
      status: 404,
      code: "TICKET_NOT_FOUND",
    });
  }

  if (existingTicket.status === input.status) {
    const currentTicket = await getTicketRecord(id);
    return serializeTicketDetail(currentTicket!);
  }

  const ticket = await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id },
      data: {
        status: input.status,
      },
      ...ticketDetailArgs,
    });

    await createTicketActivity(tx, {
      ticketId: id,
      actorId: actor.id,
      type: TicketActivityType.STATUS_CHANGED,
      message: `Status changed from ${existingTicket.status} to ${input.status}.`,
      metadata: {
        previousStatus: existingTicket.status,
        nextStatus: input.status,
      },
    });

    return tx.ticket.findUniqueOrThrow({
      where: { id },
      ...ticketDetailArgs,
    });
  });

  return serializeTicketDetail(ticket);
}
