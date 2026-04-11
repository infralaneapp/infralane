"use client";

import { useState } from "react";
import { Activity, Bot, PlusCircle, RefreshCw, UserPlus, MessageSquare, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

import { formatRelativeTime } from "@/lib/formatters";
import type { TicketActivityView } from "@/modules/tickets/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACTIVITY_CONFIG: Record<string, { icon: typeof Activity; color: string }> = {
  CREATED: { icon: PlusCircle, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30" },
  UPDATED: { icon: RefreshCw, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30" },
  ASSIGNED: { icon: UserPlus, color: "text-violet-500 bg-violet-50 dark:bg-violet-950/30" },
  STATUS_CHANGED: { icon: RefreshCw, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" },
  COMMENTED: { icon: MessageSquare, color: "text-sky-500 bg-sky-50 dark:bg-sky-950/30" },
  APPROVAL_REQUESTED: { icon: ShieldAlert, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
  APPROVAL_APPROVED: { icon: ShieldCheck, color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
  APPROVAL_REJECTED: { icon: ShieldX, color: "text-red-500 bg-red-50 dark:bg-red-950/30" },
};

type ActivityLogProps = {
  activities: TicketActivityView[];
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "STATUS_CHANGED", label: "Status" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "COMMENTED", label: "Comments" },
  { key: "automated", label: "Automated" },
] as const;

export function ActivityLog({ activities }: ActivityLogProps) {
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all"
      ? activities
      : filter === "automated"
        ? activities.filter((a) => (a.metadata as Record<string, unknown> | null)?.automated === true)
        : activities.filter((a) => a.type === filter);

  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Activity log</h2>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Every state change is captured for auditability.
      </p>

      <div className="mt-3 flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              filter === f.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-0">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No activity matching this filter.</p>
        ) : (
          filtered.map((activity, index) => {
            const isAutomated = (activity.metadata as Record<string, unknown> | null)?.automated === true;
            const config = ACTIVITY_CONFIG[activity.type] ?? { icon: Activity, color: "text-muted-foreground bg-muted" };
            const Icon = isAutomated ? Bot : config.icon;
            return (
              <div key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
                {index < filtered.length - 1 && (
                  <div className="absolute left-[13px] top-8 bottom-0 w-px bg-border" />
                )}
                <div className={cn("relative flex size-7 shrink-0 items-center justify-center rounded-full", config.color)}>
                  <Icon className="size-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.message}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    {isAutomated && (
                      <Bot className="size-3 text-primary" />
                    )}
                    {activity.actor?.name ?? "System"} &middot; {formatRelativeTime(activity.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
