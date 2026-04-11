"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, AlertTriangle, Clock, CheckCircle2, XCircle, Zap } from "lucide-react";
import { toast } from "sonner";

import { formatRelativeTime } from "@/lib/formatters";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";

type AutomationJob = {
  id: string;
  trigger: string;
  status: string;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  deadLetter: boolean;
  nextRunAt: string | null;
  createdAt: string;
  completedAt: string | null;
  rule: { id: string; name: string; action: string };
  ticket: { id: string; sequence: number; title: string };
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "QUEUED", label: "Queued" },
  { value: "RUNNING", label: "Running" },
  { value: "SUCCEEDED", label: "Succeeded" },
  { value: "FAILED", label: "Failed" },
  { value: "DEAD_LETTER", label: "Dead Letter" },
  { value: "SKIPPED", label: "Skipped" },
];

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  SUCCEEDED: CheckCircle2,
  FAILED: XCircle,
  DEAD_LETTER: AlertTriangle,
  QUEUED: Clock,
  RUNNING: RefreshCw,
};

const STATUS_CLASS: Record<string, string> = {
  SUCCEEDED: "text-green-600",
  FAILED: "text-destructive",
  DEAD_LETTER: "text-amber-600",
  QUEUED: "text-muted-foreground",
  RUNNING: "text-blue-600",
  SKIPPED: "text-muted-foreground",
};

export default function AutomationJobsPage() {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/automation/jobs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch jobs.");
      const json = await res.json();
      setJobs(json.data.jobs);
      setTotalPages(json.data.totalPages);
    } catch {
      toast.error("Could not load automation jobs.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Automation Jobs</h2>
          <p className="text-sm text-muted-foreground">Monitor and manage automation job execution.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { if (v) { setStatusFilter(v); setPage(1); } }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchJobs}>
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      <Card className="shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Attempts</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={Zap}
                    title="No jobs matching this filter"
                    description="Try changing the status filter or check back later."
                  />
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => {
                const Icon = STATUS_ICON[job.status];
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium text-foreground">{job.rule.name}</TableCell>
                    <TableCell>
                      <a href={`/tickets/${job.ticket.id}`} className="text-sm text-primary hover:underline">
                        INF-{job.ticket.sequence}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {job.trigger.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`inline-flex items-center gap-1 text-xs font-medium ${STATUS_CLASS[job.status] ?? ""}`}>
                        {Icon && <Icon className="size-3.5" />}
                        {job.status.replace(/_/g, " ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {job.attempts}/{job.maxAttempts}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(job.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(job.status === "FAILED" || job.status === "DEAD_LETTER") && (
                          <Button variant="ghost" size="sm" onClick={() => handleRetry(job.id)}>
                            <RefreshCw className="size-3.5 mr-1" />
                            Retry
                          </Button>
                        )}
                        {job.error && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                          >
                            {expandedId === job.id ? "Hide" : "Error"}
                          </Button>
                        )}
                      </div>
                      {expandedId === job.id && job.error && (
                        <p className="mt-1 rounded bg-destructive/10 px-2 py-1.5 text-xs text-destructive text-left">
                          {job.error}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
