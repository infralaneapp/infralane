import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSlaRemaining, formatSlaCountdown, SLA_THRESHOLDS } from "@/lib/sla";
import type { TicketPriorityValue } from "@/modules/tickets/types";

// SLA targets in hours per priority
const SLA_TARGETS: Record<TicketPriorityValue, { response: number; resolution: number }> = {
  URGENT: { response: 1, resolution: 4 },
  HIGH: { response: 4, resolution: 24 },
  MEDIUM: { response: 8, resolution: 72 },
  LOW: { response: 24, resolution: 168 },
};

function formatDuration(ms: number) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getCountdownColor(remainingMs: number, thresholdMs: number): string {
  if (remainingMs < 0) return "text-red-600 dark:text-red-400";
  const ratio = remainingMs / thresholdMs;
  if (ratio < 0.5) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

type SlaIndicatorProps = {
  createdAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  priority: TicketPriorityValue;
  status: string;
};

export function SlaIndicator({ createdAt, firstResponseAt, resolvedAt, priority, status }: SlaIndicatorProps) {
  const targets = SLA_TARGETS[priority];
  const created = new Date(createdAt).getTime();
  const now = Date.now();

  const responseTime = firstResponseAt
    ? new Date(firstResponseAt).getTime() - created
    : (status !== "CLOSED" && status !== "RESOLVED" ? now - created : null);

  const resolutionTime = resolvedAt
    ? new Date(resolvedAt).getTime() - created
    : (status !== "CLOSED" && status !== "RESOLVED" ? now - created : null);

  const responseBreached = responseTime !== null && responseTime > targets.response * 60 * 60 * 1000;
  const resolutionBreached = resolutionTime !== null && resolutionTime > targets.resolution * 60 * 60 * 1000;

  // Live countdown values
  const responseRemaining = getSlaRemaining(priority, createdAt, "response", firstResponseAt, resolvedAt);
  const resolutionRemaining = getSlaRemaining(priority, createdAt, "resolution", firstResponseAt, resolvedAt);

  const thresholds = SLA_THRESHOLDS[priority];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-badge text-muted-foreground">First response</span>
        <div className="flex items-center gap-1.5">
          {firstResponseAt ? (
            <CheckCircle2 className="size-3 text-emerald-500" />
          ) : responseBreached ? (
            <AlertTriangle className="size-3 text-red-500" />
          ) : (
            <Clock className="size-3 text-muted-foreground" />
          )}
          <span className={cn("text-xs font-medium", responseBreached && !firstResponseAt ? "text-red-600 dark:text-red-400" : "text-foreground")}>
            {responseTime !== null ? formatDuration(responseTime) : "—"}
          </span>
          <span className="text-[10px] text-muted-foreground">/ {targets.response}h</span>
        </div>
      </div>
      {responseRemaining !== null && (
        <div className="flex justify-end">
          <span className={cn("text-[10px] font-medium", getCountdownColor(responseRemaining, thresholds.responseHours * 60 * 60 * 1000))}>
            {formatSlaCountdown(responseRemaining)}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-badge text-muted-foreground">Resolution</span>
        <div className="flex items-center gap-1.5">
          {resolvedAt ? (
            <CheckCircle2 className="size-3 text-emerald-500" />
          ) : resolutionBreached ? (
            <AlertTriangle className="size-3 text-red-500" />
          ) : (
            <Clock className="size-3 text-muted-foreground" />
          )}
          <span className={cn("text-xs font-medium", resolutionBreached && !resolvedAt ? "text-red-600 dark:text-red-400" : "text-foreground")}>
            {resolutionTime !== null ? formatDuration(resolutionTime) : "—"}
          </span>
          <span className="text-[10px] text-muted-foreground">/ {targets.resolution}h</span>
        </div>
      </div>
      {resolutionRemaining !== null && (
        <div className="flex justify-end">
          <span className={cn("text-[10px] font-medium", getCountdownColor(resolutionRemaining, thresholds.resolutionHours * 60 * 60 * 1000))}>
            {formatSlaCountdown(resolutionRemaining)}
          </span>
        </div>
      )}
    </div>
  );
}
