import { TICKET_PRIORITY_LABELS } from "@/modules/tickets/constants";
import type { TicketPriorityValue } from "@/modules/tickets/types";
import { Badge } from "@/components/ui/badge";

const priorityStyles: Record<TicketPriorityValue, string> = {
  LOW: "bg-muted text-muted-foreground border-transparent",
  MEDIUM: "bg-blue-50 text-blue-700 border-transparent dark:bg-blue-950 dark:text-blue-300",
  HIGH: "bg-orange-50 text-orange-700 border-transparent dark:bg-orange-950 dark:text-orange-300",
  URGENT: "bg-red-50 text-red-700 border-transparent dark:bg-red-950 dark:text-red-300",
};

type PriorityBadgeProps = {
  priority: TicketPriorityValue;
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <Badge className={`text-[11px] font-medium ${priorityStyles[priority]}`}>
      {TICKET_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
