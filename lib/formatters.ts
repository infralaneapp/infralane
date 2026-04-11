import { TICKET_STATUS_LABELS } from "@/modules/tickets/constants";
import type { TicketStatusValue } from "@/modules/tickets/types";

export function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatRelativeTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDateTime(date);
}

export function formatTicketStatus(status: TicketStatusValue) {
  return TICKET_STATUS_LABELS[status];
}

export function formatAge(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 60) return "<1h";
  if (diffHr < 24) return `${diffHr}h`;
  return `${diffDay}d`;
}

export function isStale(value: string | Date, thresholdHours = 48): boolean {
  const date = typeof value === "string" ? new Date(value) : value;
  return Date.now() - date.getTime() > thresholdHours * 60 * 60 * 1000;
}

export function getUserAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 50%, 55%)`;
}
