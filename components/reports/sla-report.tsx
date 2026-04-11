"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface SlaStats {
  [priority: string]: {
    total: number;
    responseMet: number;
    resolutionMet: number;
  };
}

interface WeeklyDataPoint {
  week: string;
  created: number;
  resolved: number;
}

interface SlaReportData {
  slaStats: SlaStats;
  weeklyData: WeeklyDataPoint[];
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function pct(met: number, total: number): string {
  if (total === 0) return "N/A";
  return `${Math.round((met / total) * 100)}%`;
}

function pctColor(met: number, total: number): string {
  if (total === 0) return "text-muted-foreground";
  const ratio = met / total;
  if (ratio >= 0.9) return "text-emerald-600";
  if (ratio >= 0.7) return "text-amber-600";
  return "text-red-600";
}

const priorityOrder = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function SlaReport() {
  const [data, setData] = useState<SlaReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/sla");
      if (!res.ok) throw new Error("Failed to fetch SLA report.");
      const json = await res.json();
      setData(json.data);
    } catch {
      toast.error("Could not load SLA report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return (
      <Card className="p-8 shadow-card">
        <p className="text-sm text-muted-foreground">Loading SLA report...</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-8 shadow-card">
        <p className="text-sm text-muted-foreground">Failed to load report data.</p>
      </Card>
    );
  }

  const { slaStats, weeklyData } = data;

  const maxWeekly = Math.max(
    1,
    ...weeklyData.map((w) => Math.max(w.created, w.resolved))
  );

  return (
    <div className="space-y-6">
      {/* SLA compliance by priority */}
      <Card className="shadow-card overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-sm font-semibold text-foreground">SLA Compliance by Priority</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Percentage of resolved tickets meeting response and resolution SLA targets.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead className="text-center">Total Resolved</TableHead>
              <TableHead className="text-center">Response Met %</TableHead>
              <TableHead className="text-center">Resolution Met %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priorityOrder.map((priority) => {
              const s = slaStats[priority];
              if (!s) return null;
              return (
                <TableRow key={priority}>
                  <TableCell>
                    <Badge
                      variant={
                        priority === "URGENT"
                          ? "destructive"
                          : priority === "HIGH"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-foreground font-medium">
                    {s.total}
                  </TableCell>
                  <TableCell className={`text-center font-medium ${pctColor(s.responseMet, s.total)}`}>
                    {pct(s.responseMet, s.total)}
                  </TableCell>
                  <TableCell className={`text-center font-medium ${pctColor(s.resolutionMet, s.total)}`}>
                    {pct(s.resolutionMet, s.total)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Weekly trend */}
      <Card className="p-5 shadow-card">
        <h2 className="text-sm font-semibold text-foreground">Weekly Trend</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tickets created vs resolved over the last 8 weeks.
        </p>

        <div className="mt-5 space-y-3">
          {weeklyData.map((w) => (
            <div key={w.week} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">
                  {w.week}
                </span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Created: {w.created}</span>
                  <span>Resolved: {w.resolved}</span>
                </div>
              </div>
              <div className="space-y-1">
                {/* Created bar */}
                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] text-muted-foreground text-right">Created</span>
                  <div className="flex-1 h-4 rounded-sm bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-sm bg-blue-500/70 transition-all"
                      style={{ width: `${(w.created / maxWeekly) * 100}%` }}
                    />
                  </div>
                </div>
                {/* Resolved bar */}
                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] text-muted-foreground text-right">Resolved</span>
                  <div className="flex-1 h-4 rounded-sm bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-sm bg-emerald-500/70 transition-all"
                      style={{ width: `${(w.resolved / maxWeekly) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-blue-500/70" />
            <span className="text-xs text-muted-foreground">Created</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-emerald-500/70" />
            <span className="text-xs text-muted-foreground">Resolved</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
