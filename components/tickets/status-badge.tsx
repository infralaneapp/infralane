import { formatTicketStatus } from "@/lib/formatters";
import type { TicketStatusValue } from "@/modules/tickets/types";

const statusClasses: Record<TicketStatusValue, string> = {
  OPEN: "border-blue-200 bg-blue-50 text-blue-700",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-700",
  WAITING_FOR_REQUESTER: "border-violet-200 bg-violet-50 text-violet-700",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLOSED: "border-slate-200 bg-slate-100 text-slate-700",
};

type StatusBadgeProps = {
  status: TicketStatusValue;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${statusClasses[status]}`}
    >
      {formatTicketStatus(status)}
    </span>
  );
}
