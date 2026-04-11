import { AlertCircle, Clock, PlayCircle, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketStatusValue } from "@/modules/tickets/types";

type NextActionProps = {
  status: TicketStatusValue;
  assigneeId: string | null;
  isAdmin: boolean;
};

type ActionConfig = {
  label: string;
  icon: typeof AlertCircle;
  className: string;
};

function getNextAction(status: TicketStatusValue, assigneeId: string | null): ActionConfig {
  if (status === "OPEN" && !assigneeId) {
    return { label: "Needs triage", icon: AlertCircle, className: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800" };
  }
  if (status === "OPEN" && assigneeId) {
    return { label: "Pending start", icon: Clock, className: "text-muted-foreground bg-muted border-border" };
  }
  if (status === "IN_PROGRESS") {
    return { label: "In progress", icon: PlayCircle, className: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800" };
  }
  if (status === "WAITING_FOR_REQUESTER") {
    return { label: "Awaiting response", icon: MessageSquare, className: "text-violet-600 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-950/30 dark:border-violet-800" };
  }
  if (status === "RESOLVED") {
    return { label: "Ready to close", icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800" };
  }
  return { label: "Closed", icon: XCircle, className: "text-muted-foreground bg-muted border-border" };
}

export function NextAction({ status, assigneeId, isAdmin }: NextActionProps) {
  if (!isAdmin) return null;
  if (status === "CLOSED") return null;

  const action = getNextAction(status, assigneeId);
  const Icon = action.icon;

  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium", action.className)}>
      <Icon className="size-3.5" />
      {action.label}
    </div>
  );
}

// Export the mapping for use in the table
export function getNextActionLabel(status: TicketStatusValue, assigneeId: string | null): { label: string; className: string } {
  const config = getNextAction(status, assigneeId);
  return { label: config.label, className: config.className };
}
