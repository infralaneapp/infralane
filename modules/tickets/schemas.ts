import { z } from "zod";

import { TICKET_PRIORITY_VALUES, TICKET_STATUS_VALUES, TICKET_TYPE_KEYS } from "@/modules/tickets/constants";

export const ticketFieldInputSchema = z.object({
  key: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(4000),
});

export const createTicketSchema = z.object({
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().max(4000).optional(),
  ticketTypeKey: z.enum(TICKET_TYPE_KEYS),
  priority: z.enum(TICKET_PRIORITY_VALUES).default("MEDIUM"),
  fields: z.array(ticketFieldInputSchema).default([]),
});

export const listTicketsFilterSchema = z.object({
  status: z.enum(TICKET_STATUS_VALUES).optional(),
  type: z.enum(TICKET_TYPE_KEYS).optional(),
  assigneeId: z.union([z.string().cuid(), z.literal("unassigned")]).optional(),
  view: z.enum(["all", "mine"]).optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateTicketSchema = z
  .object({
    title: z.string().trim().min(4).max(160).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    fields: z.array(ticketFieldInputSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one property must be supplied.",
  });

export const assignTicketSchema = z.object({
  assigneeId: z.string().cuid().nullable(),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(TICKET_STATUS_VALUES),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type ListTicketsFilterInput = z.infer<typeof listTicketsFilterSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
