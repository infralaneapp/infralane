"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { formatRelativeTime } from "@/lib/formatters";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type JobEvent = {
  id: string;
  event: string;
  detail: string | null;
  createdAt: string;
};

type AutomationJob = {
  id: string;
  trigger: string;
  status: string;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  deadLetter: boolean;
  createdAt: string;
  completedAt: string | null;
  rule: { id: string; name: string; action: string };
  events?: JobEvent[];
};

type AutomationPanelProps = {
  ticketId: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SUCCEEDED: "default",
  FAILED: "destructive",
  DEAD_LETTER: "destructive",
  RUNNING: "outline",
  QUEUED: "secondary",
  SKIPPED: "secondary",
};

export function AutomationPanel({ ticketId }: AutomationPanelProps) {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/automation-jobs`);
      if (!res.ok) return;
      const json = await res.json();
      setJobs(json.data.jobs);
    } catch {
      // silent — panel is supplementary
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  async function handleRetry(jobId: string) {
    try {
      const res = await fetch(`/api/automation/jobs/${jobId}/retry`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? "Retry failed.");
      }
      toast.success("Job queued for retry.");
      fetchJobs();
    } catch (err: any) {
      toast.error(err.message ?? "Could not retry job.");
    }
  }

  if (loading) {
    return (
      <Card className="p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Automations</h2>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Loading...</p>
      </Card>
    );
  }

  if (jobs.length === 0) return null;

  return (
    <Card className="p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Bot className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Automations</h2>
        <span className="text-xs text-muted-foreground">({jobs.length})</span>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Jobs triggered by automation rules.
      </p>

      <div className="mt-4 space-y-2">
        {jobs.map((job) => (
          <div key={job.id} className="rounded-lg border border-border px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{job.rule.name}</p>
                <p className="text-xs text-muted-foreground">
                  {job.trigger.replace(/_/g, " ").toLowerCase()} &middot; {formatRelativeTime(job.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant={STATUS_VARIANT[job.status] ?? "secondary"} className="text-[10px]">
                  {job.status}
                </Badge>
                {(job.status === "FAILED" || job.status === "DEAD_LETTER") && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRetry(job.id)}
                    title="Retry"
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {((job.status === "FAILED" || job.status === "DEAD_LETTER") && job.error) || (job.events && job.events.length > 0) ? (
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                className="mt-1 text-xs text-primary hover:underline"
              >
                {expandedId === job.id ? "Hide details" : "Show details"}
              </button>
            ) : null}
            {expandedId === job.id && (
              <div className="mt-2 space-y-1.5">
                {job.error && (
                  <p className="rounded bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                    {job.error}
                  </p>
                )}
                {job.events && job.events.length > 0 && (
                  <div className="rounded border border-border bg-muted/30 px-2 py-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Event timeline</p>
                    {job.events.map((evt) => (
                      <div key={evt.id} className="flex items-start gap-2 py-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(evt.createdAt)}
                        </span>
                        <span className="text-xs text-foreground">
                          <span className="font-medium">{evt.event}</span>
                          {evt.detail && <span className="text-muted-foreground"> — {evt.detail}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
