import { formatTicketStatus } from "@/lib/formatters";
import type { TicketStatusValue } from "@/modules/tickets/types";
import { Badge } from "@/components/ui/badge";

const statusStyles: Record<TicketStatusValue, string> = {
  OPEN: "bg-[var(--status-open-bg)] text-[var(--status-open)] border-transparent",
  IN_PROGRESS: "bg-[var(--status-progress-bg)] text-[var(--status-progress)] border-transparent",
  WAITING_FOR_REQUESTER: "bg-[var(--status-waiting-bg)] text-[var(--status-waiting)] border-transparent",
  RESOLVED: "bg-[var(--status-resolved-bg)] text-[var(--status-resolved)] border-transparent",
  CLOSED: "bg-[var(--status-closed-bg)] text-[var(--status-closed)] border-transparent",
};

const statusDots: Record<TicketStatusValue, string> = {
  OPEN: "bg-[var(--status-open)]",
  IN_PROGRESS: "bg-[var(--status-progress)]",
  WAITING_FOR_REQUESTER: "bg-[var(--status-waiting)]",
  RESOLVED: "bg-[var(--status-resolved)]",
  CLOSED: "bg-[var(--status-closed)]",
};

type StatusBadgeProps = {
  status: TicketStatusValue;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      className={`gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-badge ${statusStyles[status]}`}
    >
      <span className={`inline-block size-1.5 rounded-full ${statusDots[status]}`} />
      {formatTicketStatus(status)}
    </Badge>
  );
}
