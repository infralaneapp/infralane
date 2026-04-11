"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

const DATE_RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "All time", value: "" },
] as const;

const PRIORITIES = ["", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;

type DashboardFiltersProps = {
  currentFrom?: string;
  currentTo?: string;
  currentType?: string;
  currentPriority?: string;
  ticketTypes: { id: string; name: string }[];
};

export function DashboardFilters({
  currentFrom,
  currentTo,
  currentType,
  currentPriority,
  ticketTypes,
}: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Determine which date range button is active
  function getActiveDays(): string {
    if (!currentFrom) return "";
    if (!currentTo) {
      const fromDate = new Date(currentFrom);
      const diffMs = Date.now() - fromDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 8) return "7";
      if (diffDays <= 31) return "30";
      if (diffDays <= 91) return "90";
    }
    return "";
  }

  const activeDays = getActiveDays();

  function handleDateRange(days: string) {
    if (!days) {
      updateParams({ from: "", to: "" });
    } else {
      const from = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      updateParams({ from, to: "" });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
        {DATE_RANGES.map((range) => (
          <Button
            key={range.value}
            variant={activeDays === range.value ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleDateRange(range.value)}
          >
            {range.label}
          </Button>
        ))}
      </div>

      <select
        className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
        value={currentType ?? ""}
        onChange={(e) => updateParams({ type: e.target.value })}
      >
        <option value="">All types</option>
        {ticketTypes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <select
        className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
        value={currentPriority ?? ""}
        onChange={(e) => updateParams({ priority: e.target.value })}
      >
        <option value="">All priorities</option>
        {PRIORITIES.filter((p) => p !== "").map((p) => (
          <option key={p} value={p}>
            {p.charAt(0) + p.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
