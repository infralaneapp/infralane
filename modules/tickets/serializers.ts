import { Prisma } from "@prisma/client";

import { mapStructuredFields, parseTicketFieldSchema } from "@/modules/tickets/field-schema";
import type { TicketDetail, TicketSummary, TicketTypeView, UserOption } from "@/modules/tickets/types";

export const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
} satisfies Prisma.UserSelect;

type SelectedUser = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

export const ticketSummaryArgs = Prisma.validator<Prisma.TicketDefaultArgs>()({
  include: {
    requester: {
      select: userSelect,
    },
    assignee: {
      select: userSelect,
    },
    ticketType: true,
  },
});

export const ticketDetailArgs = Prisma.validator<Prisma.TicketDefaultArgs>()({
  include: {
    requester: {
      select: userSelect,
    },
    assignee: {
      select: userSelect,
    },
    ticketType: true,
    fields: {
      orderBy: {
        key: "asc",
      },
    },
    comments: {
      orderBy: {
        createdAt: "asc",
      },
      include: {
        author: {
          select: userSelect,
        },
      },
    },
    activities: {
      orderBy: {
        createdAt: "desc",
      },
      include: {
        actor: {
          select: userSelect,
        },
      },
    },
  },
});

export type TicketSummaryRecord = Prisma.TicketGetPayload<typeof ticketSummaryArgs>;
export type TicketDetailRecord = Prisma.TicketGetPayload<typeof ticketDetailArgs>;

export function formatTicketReference(sequence: number) {
  return `OPS-${sequence.toString().padStart(4, "0")}`;
}

export function serializeUser(user: SelectedUser | null): UserOption | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export function serializeTicketType(ticketType: {
  id: string;
  key: string;
  name: string;
  description: string | null;
  fieldSchema: unknown;
}): TicketTypeView {
  return {
    id: ticketType.id,
    key: ticketType.key as TicketTypeView["key"],
    name: ticketType.name,
    description: ticketType.description,
    fieldSchema: parseTicketFieldSchema(ticketType.fieldSchema),
  };
}

export function serializeTicketSummary(ticket: TicketSummaryRecord): TicketSummary {
  return {
    id: ticket.id,
    reference: formatTicketReference(ticket.sequence),
    title: ticket.title,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    requester: serializeUser(ticket.requester)!,
    assignee: serializeUser(ticket.assignee),
    type: {
      id: ticket.ticketType.id,
      key: ticket.ticketType.key as TicketSummary["type"]["key"],
      name: ticket.ticketType.name,
    },
  };
}

export function serializeTicketDetail(ticket: TicketDetailRecord): TicketDetail {
  const ticketType = serializeTicketType(ticket.ticketType);

  return {
    ...serializeTicketSummary(ticket),
    description: ticket.description,
    ticketType,
    structuredFields: mapStructuredFields(ticketType.fieldSchema, ticket.fields),
    comments: ticket.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: serializeUser(comment.author)!,
    })),
    activities: ticket.activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      message: activity.message,
      createdAt: activity.createdAt.toISOString(),
      actor: serializeUser(activity.actor),
    })),
  };
}
