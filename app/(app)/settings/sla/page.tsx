"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Threshold = { responseHours: number; resolutionHours: number };
type Thresholds = Record<string, Threshold>;

const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "text-red-600",
  HIGH: "text-orange-600",
  MEDIUM: "text-blue-600",
  LOW: "text-muted-foreground",
};

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h >= 24) return `${Math.round(h / 24)}d`;
  return `${h}h`;
}

export default function SlaSettingsPage() {
  const [thresholds, setThresholds] = useState<Thresholds>({
    URGENT: { responseHours: 1, resolutionHours: 4 },
    HIGH: { responseHours: 4, resolutionHours: 24 },
    MEDIUM: { responseHours: 8, resolutionHours: 72 },
    LOW: { responseHours: 24, resolutionHours: 168 },
  });
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchThresholds = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/sla-thresholds");
      if (!res.ok) return;
      const json = await res.json();
      setThresholds(json.data.thresholds);
      setIsDefault(json.data.isDefault);
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchThresholds(); }, [fetchThresholds]);

  function updateThreshold(priority: string, field: keyof Threshold, value: string) {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return;
    setThresholds((prev) => ({
      ...prev,
      [priority]: { ...prev[priority], [field]: num },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/sla-thresholds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(thresholds),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? "Save failed");
      }
      toast.success("SLA thresholds saved.");
      setIsDefault(false);
    } catch (err: any) {
      toast.error(err.message ?? "Could not save thresholds.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Card className="p-8 shadow-card"><p className="text-sm text-muted-foreground">Loading...</p></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">SLA Thresholds</h2>
          <p className="text-sm text-muted-foreground">
            Define response and resolution time targets per priority level.
          </p>
        </div>
        <Badge variant={isDefault ? "secondary" : "default"}>
          {isDefault ? "Using defaults" : "Custom"}
        </Badge>
      </div>

      <Card className="p-5 shadow-card space-y-5">
        <div className="grid gap-4">
          {PRIORITIES.map((priority) => {
            const t = thresholds[priority];
            if (!t) return null;
            return (
              <div key={priority} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-sm font-semibold ${PRIORITY_COLORS[priority]}`}>
                    {priority}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (currently: response {formatHours(t.responseHours)}, resolution {formatHours(t.resolutionHours)})
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`${priority}-response`}>Response time (hours)</Label>
                    <Input
                      id={`${priority}-response`}
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={t.responseHours}
                      onChange={(e) => updateThreshold(priority, "responseHours", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${priority}-resolution`}>Resolution time (hours)</Label>
                    <Input
                      id={`${priority}-resolution`}
                      type="number"
                      step="1"
                      min="0.1"
                      value={t.resolutionHours}
                      onChange={(e) => updateThreshold(priority, "resolutionHours", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save thresholds"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Changes take effect within 1 minute (cached).
          </p>
        </div>
      </Card>

      <Card className="p-5 shadow-card">
        <h3 className="text-sm font-semibold text-foreground">How SLA works</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          <li><strong>Response time</strong> — Time from ticket creation until the first status change (OPEN to anything else).</li>
          <li><strong>Resolution time</strong> — Time from ticket creation until the ticket reaches RESOLVED status.</li>
          <li><strong>Breach detection</strong> — The automation worker checks active tickets every 60 seconds and emits SLA_BREACHED triggers when thresholds are exceeded.</li>
          <li><strong>Automation rules</strong> — Create rules with the SLA_BREACHED trigger to auto-escalate, notify, or reassign when breaches occur.</li>
        </ul>
      </Card>
    </div>
  );
}
