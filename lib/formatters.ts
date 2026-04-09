import { TICKET_STATUS_LABELS } from "@/modules/tickets/constants";
import type { TicketStatusValue } from "@/modules/tickets/types";

export function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatTicketStatus(status: TicketStatusValue) {
  return TICKET_STATUS_LABELS[status];
}
