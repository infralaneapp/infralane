"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EscalationStep = {
  delayMinutes: number;
  action: "notify";
  targetUserId: string;
};

type EscalationPolicy = {
  id: string;
  name: string;
  enabled: boolean;
  steps: EscalationStep[];
  createdAt: string;
};

type TeamUser = {
  id: string;
  name: string | null;
  email: string;
};

export default function EscalationsPage() {
  const [policies, setPolicies] = useState<EscalationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);

  // Create form state
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [steps, setSteps] = useState<EscalationStep[]>([
    { delayMinutes: 15, action: "notify", targetUserId: "" },
  ]);
  const [saving, setSaving] = useState(false);

  async function fetchTeamUsers() {
    try {
      const res = await fetch("/api/settings/team");
      if (!res.ok) return;
      const json = await res.json();
      if (json.data?.members) {
        setTeamUsers(json.data.members.map((m: { id: string; name: string | null; email: string }) => ({
          id: m.id,
          name: m.name,
          email: m.email,
        })));
      }
    } catch {
      // ignore
    }
  }

  async function fetchPolicies() {
    try {
      const res = await fetch("/api/settings/escalations");
      const data = await res.json();
      if (data.success) setPolicies(data.data.policies);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPolicies();
    fetchTeamUsers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, enabled, steps }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error?.message ?? "Failed to create policy.");
        return;
      }
      toast.success("Escalation policy created.");
      setName("");
      setEnabled(true);
      setSteps([{ delayMinutes: 15, action: "notify", targetUserId: "" }]);
      fetchPolicies();
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(policy: EscalationPolicy) {
    const res = await fetch(`/api/settings/escalations/${policy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !policy.enabled }),
    });
    if (res.ok) {
      toast.success(`Policy ${policy.enabled ? "disabled" : "enabled"}.`);
      fetchPolicies();
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/settings/escalations/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Policy deleted.");
      fetchPolicies();
    }
  }

  function updateStep(index: number, field: keyof EscalationStep, value: string | number) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function addStep() {
    setSteps((prev) => [...prev, { delayMinutes: 15, action: "notify", targetUserId: "" }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      {/* Existing policies */}
      <Card className="shadow-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Escalation Policies</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define escalation chains that trigger when tickets breach SLA thresholds.
          </p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : policies.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No escalation policies yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[12px] font-medium uppercase tracking-label text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="text-[12px] font-medium uppercase tracking-label text-muted-foreground">
                  Steps
                </TableHead>
                <TableHead className="text-[12px] font-medium uppercase tracking-label text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="py-3 text-sm font-medium text-foreground">
                    {policy.name}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground">
                    {(policy.steps as EscalationStep[]).length} step(s)
                  </TableCell>
                  <TableCell className="py-3">
                    <button onClick={() => toggleEnabled(policy)}>
                      <Badge variant={policy.enabled ? "default" : "secondary"}>
                        {policy.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(policy.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create form */}
      <Card className="shadow-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Create Policy</h2>
        </div>
        <form onSubmit={handleCreate} className="p-4 space-y-4">
          <div>
            <Label htmlFor="policy-name">Name</Label>
            <Input
              id="policy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. P1 Incident Escalation"
              className="mt-1.5 max-w-md"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="policy-enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="size-4 rounded border-input accent-primary"
            />
            <Label htmlFor="policy-enabled">Enabled</Label>
          </div>

          <div className="space-y-3">
            <Label>Steps</Label>
            {steps.map((step, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
                <div className="min-w-[120px]">
                  <Label className="text-xs">Delay (minutes)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={step.delayMinutes}
                    onChange={(e) => updateStep(i, "delayMinutes", parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs">Target User</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                    value={step.targetUserId}
                    onChange={(e) => updateStep(i, "targetUserId", e.target.value)}
                    required
                  >
                    <option value="">Select a user...</option>
                    {teamUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ? `${u.name} (${u.email})` : u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStep(i)}
                  disabled={steps.length <= 1}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="size-4 mr-1" />
              Add step
            </Button>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Policy"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
