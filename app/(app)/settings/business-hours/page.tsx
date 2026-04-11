"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const DEFAULT_SCHEDULE: Record<string, { start: string; end: string }> = {
  monday: { start: "09:00", end: "17:00" },
  tuesday: { start: "09:00", end: "17:00" },
  wednesday: { start: "09:00", end: "17:00" },
  thursday: { start: "09:00", end: "17:00" },
  friday: { start: "09:00", end: "17:00" },
  saturday: { start: "", end: "" },
  sunday: { start: "", end: "" },
};

export default function BusinessHoursPage() {
  const [timezone, setTimezone] = useState("UTC");
  const [schedule, setSchedule] = useState<Record<string, { start: string; end: string }>>(
    () => structuredClone(DEFAULT_SCHEDULE),
  );
  const [holidays, setHolidays] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/business-hours");
      if (!res.ok) throw new Error();
      const json = await res.json();
      const config = json.data.config;
      if (config) {
        setTimezone(config.timezone ?? "UTC");
        if (config.schedule && typeof config.schedule === "object") {
          setSchedule({ ...structuredClone(DEFAULT_SCHEDULE), ...config.schedule });
        }
        if (Array.isArray(config.holidays)) {
          setHolidays(config.holidays.join("\n"));
        }
      }
    } catch {
      // No config yet, use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  function updateDay(day: string, field: "start" | "end", value: string) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Filter out days with empty times
      const filteredSchedule: Record<string, { start: string; end: string }> = {};
      for (const [day, times] of Object.entries(schedule)) {
        if (times.start && times.end) {
          filteredSchedule[day] = times;
        }
      }

      const holidayList = holidays
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const res = await fetch("/api/settings/business-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone,
          schedule: filteredSchedule,
          holidays: holidayList,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? "Save failed.");
      }
      toast.success("Business hours saved.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not save business hours.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-8 shadow-card">
        <p className="text-sm text-muted-foreground">Loading business hours...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 shadow-card space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Business Hours</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define your operating hours for SLA calculations. Leave start/end empty to mark a day as non-working.
          </p>
        </div>

        <Separator />

        <div className="space-y-1.5 max-w-md">
          <Label htmlFor="bh-timezone">Timezone</Label>
          <Input
            id="bh-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="e.g. UTC, America/New_York"
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <Label>Weekly Schedule</Label>
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium text-foreground capitalize">{day}</span>
              <Input
                type="time"
                value={schedule[day]?.start ?? ""}
                onChange={(e) => updateDay(day, "start", e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="time"
                value={schedule[day]?.end ?? ""}
                onChange={(e) => updateDay(day, "end", e.target.value)}
                className="w-32"
              />
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label htmlFor="bh-holidays">Holidays (one date per line, YYYY-MM-DD)</Label>
          <textarea
            id="bh-holidays"
            className="flex min-h-[100px] w-full max-w-md rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder={"2026-12-25\n2026-01-01"}
            value={holidays}
            onChange={(e) => setHolidays(e.target.value)}
          />
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </Card>
    </div>
  );
}
