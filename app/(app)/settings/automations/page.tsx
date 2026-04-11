"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, X, Pencil, Trash2, Download, Upload } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  conditions: Record<string, string>;
  action: string;
  actionValue: string;
  enabled: boolean;
  createdAt: string;
  jobCounts?: { total: number; succeeded: number; failed: number };
  builtIn?: boolean;
  systemKey?: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const TRIGGERS = [
  "TICKET_CREATED",
  "STATUS_CHANGED",
  "SLA_BREACHED",
  "PRIORITY_CHANGED",
  "STALE_WAITING",
  "RESOLVED_EXPIRED",
] as const;

const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  TICKET_CREATED: "When a new ticket is submitted",
  STATUS_CHANGED: "When a ticket's status is updated",
  SLA_BREACHED: "When response or resolution SLA is exceeded",
  PRIORITY_CHANGED: "When a ticket's priority changes",
  STALE_WAITING: "When waiting for requester > 3 days",
  RESOLVED_EXPIRED: "When resolved ticket > 7 days without closure",
};

const ACTIONS = [
  "ASSIGN_TO",
  "CHANGE_STATUS",
  "CHANGE_PRIORITY",
  "ADD_TAG",
  "NOTIFY",
  "SLACK_NOTIFY",
  "WEBHOOK",
  "ESCALATE",
] as const;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

type PickerOption = { id: string; label: string; sublabel?: string };

const ACTION_VALUE_CONFIG: Record<string, {
  label: string;
  placeholder: string;
  description: string;
  pickerType?: "users" | "status" | "priority" | "webhooks" | "escalations" | "special_notify";
}> = {
  ASSIGN_TO: {
    label: "Assign to",
    placeholder: "Select a user",
    description: "The operator or admin to assign the ticket to.",
    pickerType: "users",
  },
  CHANGE_STATUS: {
    label: "New status",
    placeholder: "Select a status",
    description: "The status to set on the ticket.",
    pickerType: "status",
  },
  CHANGE_PRIORITY: {
    label: "New priority",
    placeholder: "Select a priority",
    description: "The priority to set on the ticket.",
    pickerType: "priority",
  },
  ADD_TAG: {
    label: "Tag name",
    placeholder: "e.g. production, urgent, reviewed",
    description: "The tag to add. Created automatically if it doesn't exist.",
  },
  NOTIFY: {
    label: "Notify",
    placeholder: "Select who to notify",
    description: "Send an in-app notification (+ Slack DM if linked).",
    pickerType: "special_notify",
  },
  SLACK_NOTIFY: {
    label: "Slack channel",
    placeholder: "e.g. #ops-alerts",
    description: "The Slack channel to post to. Leave empty for default channel.",
  },
  WEBHOOK: {
    label: "Webhook endpoint",
    placeholder: "Select an endpoint",
    description: "The configured webhook endpoint to call.",
    pickerType: "webhooks",
  },
  ESCALATE: {
    label: "Escalation policy",
    placeholder: "Select a policy",
    description: "The escalation policy to execute (multi-step notifications).",
    pickerType: "escalations",
  },
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, dialogProps } = useConfirm();

  // Picker data
  const [users, setUsers] = useState<PickerOption[]>([]);
  const [webhooks, setWebhooks] = useState<PickerOption[]>([]);
  const [escalations, setEscalations] = useState<PickerOption[]>([]);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formTrigger, setFormTrigger] = useState<string>(TRIGGERS[0]);
  const [formAction, setFormAction] = useState<string>(ACTIONS[0]);
  const [formActionValue, setFormActionValue] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [conditionPairs, setConditionPairs] = useState<{ key: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);

  /* ---------------------------------------------------------------------- */
  /*  Fetch                                                                 */
  /* ---------------------------------------------------------------------- */

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/automations");
      if (!res.ok) throw new Error("Failed to fetch rules.");
      const json = await res.json();
      setRules(json.data.rules);
    } catch {
      toast.error("Could not load automation rules.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch picker data on mount
  useEffect(() => {
    // Users (for ASSIGN_TO, NOTIFY)
    fetch("/api/settings/team").then((r) => r.json()).then((j) => {
      if (j.data?.members) {
        setUsers(j.data.members.map((m: any) => ({ id: m.id, label: m.name, sublabel: m.email })));
      }
    }).catch(() => {});
    // Webhooks
    fetch("/api/settings/webhooks").then((r) => r.json()).then((j) => {
      if (j.data?.webhooks) {
        setWebhooks(j.data.webhooks.map((w: any) => ({ id: w.id, label: w.name, sublabel: w.url })));
      }
    }).catch(() => {});
    // Escalation policies
    fetch("/api/settings/escalations").then((r) => r.json()).then((j) => {
      if (j.data?.policies) {
        setEscalations(j.data.policies.map((p: any) => ({ id: p.id, label: p.name })));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  /* ---------------------------------------------------------------------- */
  /*  Create                                                                */
  /* ---------------------------------------------------------------------- */

  function resetForm() {
    setFormName("");
    setFormTrigger(TRIGGERS[0]);
    setFormAction(ACTIONS[0]);
    setFormActionValue("");
    setFormEnabled(true);
    setConditionPairs([]);
    setShowForm(false);
  }

  async function handleCreate() {
    if (!formName.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!formActionValue.trim()) {
      toast.error("Action value is required.");
      return;
    }

    const conditions: Record<string, string> = {};
    for (const pair of conditionPairs) {
      if (pair.key.trim() && pair.value.trim()) {
        conditions[pair.key.trim()] = pair.value.trim();
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          trigger: formTrigger,
          conditions,
          action: formAction,
          actionValue: formActionValue,
          enabled: formEnabled,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Create failed.");
      }
      toast.success("Automation rule created.");
      resetForm();
      fetchRules();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  Toggle enabled                                                        */
  /* ---------------------------------------------------------------------- */

  async function handleToggle(rule: AutomationRule) {
    try {
      const res = await fetch(`/api/settings/automations/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (!res.ok) throw new Error("Failed to update.");
      toast.success(rule.enabled ? "Rule disabled." : "Rule enabled.");
      fetchRules();
    } catch {
      toast.error("Could not update rule.");
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  Delete                                                                */
  /* ---------------------------------------------------------------------- */

  async function handleDelete(rule: AutomationRule) {
    if (rule.builtIn) {
      toast.error("Built-in rules cannot be deleted.");
      return;
    }
    const confirmed = await confirm({
      title: `Delete rule "${rule.name}"?`,
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/settings/automations/${rule.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? "Delete failed.");
      }
      toast.success("Rule deleted.");
      fetchRules();
    } catch (err: any) {
      toast.error(err.message ?? "Could not delete rule.");
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  Edit (inline via PATCH)                                               */
  /* ---------------------------------------------------------------------- */

  async function handleEdit(rule: AutomationRule) {
    const newName = prompt("Rule name:", rule.name);
    if (!newName || newName === rule.name) return;
    try {
      const res = await fetch(`/api/settings/automations/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error("Failed to update.");
      toast.success("Rule updated.");
      fetchRules();
    } catch {
      toast.error("Could not update rule.");
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  Condition pairs helpers                                                */
  /* ---------------------------------------------------------------------- */

  function addConditionPair() {
    setConditionPairs((prev) => [...prev, { key: "", value: "" }]);
  }

  function updateConditionPair(index: number, field: "key" | "value", val: string) {
    setConditionPairs((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: val } : p))
    );
  }

  function removeConditionPair(index: number) {
    setConditionPairs((prev) => prev.filter((_, i) => i !== index));
  }

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <Card className="p-8 shadow-card">
        <p className="text-sm text-muted-foreground">Loading automation rules...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rules.length} automation rule{rules.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <a href="/settings/automations/jobs" className="text-sm text-primary hover:underline">
            View jobs
          </a>
          <a
            href="/api/settings/automations/export"
            className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            download
          >
            <Download className="size-3.5" />
            Export
          </a>
          <label className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer">
            <Upload className="size-3.5" />
            Import
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const data = JSON.parse(text);
                  const res = await fetch("/api/settings/automations/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json?.error?.message ?? "Import failed");
                  toast.success(`Imported ${json.data.rulesImported} rules, ${json.data.templatesImported} templates`);
                  if (json.data.errors?.length > 0) {
                    toast.error(`${json.data.errors.length} errors during import`);
                  }
                  fetchRules();
                } catch (err: any) {
                  toast.error(err.message ?? "Import failed");
                }
                e.target.value = "";
              }}
            />
          </label>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="size-4" data-icon="inline-start" />
              Create rule
            </Button>
          )}
        </div>
      </div>

      {/* Inline create form */}
      {showForm && (
        <Card className="p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">New Automation Rule</h2>
            <Button variant="ghost" size="icon-sm" onClick={resetForm}>
              <X className="size-4" />
            </Button>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                placeholder="e.g. Auto-assign urgent tickets"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rule-trigger">Trigger</Label>
              <Select value={formTrigger} onValueChange={(v) => v && setFormTrigger(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {TRIGGER_DESCRIPTIONS[formTrigger] && (
                <p className="text-xs text-muted-foreground">{TRIGGER_DESCRIPTIONS[formTrigger]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rule-action">Action</Label>
              <Select value={formAction} onValueChange={(v) => v && setFormAction(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {formatLabel(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              {(() => {
                const config = ACTION_VALUE_CONFIG[formAction];
                if (!config) return null;

                const pickerType = config.pickerType;

                // Status picker
                if (pickerType === "status") {
                  return (
                    <>
                      <Label>{config.label}</Label>
                      <select
                        className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                        value={formActionValue}
                        onChange={(e) => setFormActionValue(e.target.value)}
                      >
                        <option value="">Select a status</option>
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </>
                  );
                }

                // Priority picker
                if (pickerType === "priority") {
                  return (
                    <>
                      <Label>{config.label}</Label>
                      <select
                        className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                        value={formActionValue}
                        onChange={(e) => setFormActionValue(e.target.value)}
                      >
                        <option value="">Select a priority</option>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </>
                  );
                }

                // User picker (ASSIGN_TO)
                if (pickerType === "users") {
                  return (
                    <>
                      <Label>{config.label}</Label>
                      <select
                        className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                        value={formActionValue}
                        onChange={(e) => setFormActionValue(e.target.value)}
                      >
                        <option value="">Select a user</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.label} ({u.sublabel})</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </>
                  );
                }

                // Special notify picker (requester, assignee, or specific user)
                if (pickerType === "special_notify") {
                  return (
                    <>
                      <Label>{config.label}</Label>
                      <select
                        className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                        value={formActionValue}
                        onChange={(e) => setFormActionValue(e.target.value)}
                      >
                        <option value="">Select who to notify</option>
                        <option value="requester">Ticket requester</option>
                        <option value="assignee">Ticket assignee</option>
                        <optgroup label="Specific user">
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.label}</option>
                          ))}
                        </optgroup>
                      </select>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </>
                  );
                }

                // Webhook picker
                if (pickerType === "webhooks") {
                  return (
                    <>
                      <Label>{config.label}</Label>
                      <select
                        className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                        value={formActionValue}
                        onChange={(e) => setFormActionValue(e.target.value)}
                      >
                        <option value="">Select an endpoint</option>
                        {webhooks.map((w) => (
                          <option key={w.id} value={w.id}>{w.label} — {w.sublabel}</option>
                        ))}
                      </select>
                      {webhooks.length === 0 && (
                        <p className="text-xs text-amber-600">No webhook endpoints configured. Add one in Settings &gt; Integrations.</p>
                      )}
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </>
                  );
                }

                // Escalation picker
                if (pickerType === "escalations") {
                  return (
                    <>
                      <Label>{config.label}</Label>
                      <select
                        className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                        value={formActionValue}
                        onChange={(e) => setFormActionValue(e.target.value)}
                      >
                        <option value="">Select a policy</option>
                        {escalations.map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                      {escalations.length === 0 && (
                        <p className="text-xs text-amber-600">No escalation policies configured. Add one in Settings &gt; Escalations.</p>
                      )}
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </>
                  );
                }

                // Default: text input (ADD_TAG, SLACK_NOTIFY)
                return (
                  <>
                    <Label>{config.label}</Label>
                    <Input
                      placeholder={config.placeholder}
                      value={formActionValue}
                      onChange={(e) => setFormActionValue(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Conditions</Label>
              <Button variant="outline" size="sm" onClick={addConditionPair}>
                <Plus className="size-3.5" data-icon="inline-start" />
                Add condition
              </Button>
            </div>
            {conditionPairs.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No conditions. Rule will apply to all matching triggers.
              </p>
            )}
            {conditionPairs.map((pair, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="Key (e.g. priority)"
                  value={pair.key}
                  onChange={(e) => updateConditionPair(idx, "key", e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Value (e.g. URGENT)"
                  value={pair.value}
                  onChange={(e) => updateConditionPair(idx, "value", e.target.value)}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon-sm" onClick={() => removeConditionPair(idx)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Enabled toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formEnabled}
              onChange={(e) => setFormEnabled(e.target.checked)}
              className="accent-primary size-3.5"
            />
            <span className="text-sm text-muted-foreground">Enabled</span>
          </label>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create rule"}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Rules table */}
      <Card className="shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="text-center">Jobs</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No automation rules yet. Create your first one.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium text-foreground">
                    {rule.name}
                    {rule.builtIn && (
                      <Badge variant="outline" className="ml-2 text-[10px]">Built-in</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{formatLabel(rule.trigger)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className="font-medium">{formatLabel(rule.action)}</span>
                    {": "}
                    {(() => {
                      const v = rule.actionValue;
                      if (v === "requester") return "Ticket requester";
                      if (v === "assignee") return "Ticket assignee";
                      const user = users.find((u) => u.id === v);
                      if (user) return user.label;
                      const wh = webhooks.find((w) => w.id === v);
                      if (wh) return wh.label;
                      const esc = escalations.find((e) => e.id === v);
                      if (esc) return esc.label;
                      return v;
                    })()}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {rule.jobCounts ? (
                      <span>
                        <span className="text-green-600">{rule.jobCounts.succeeded}</span>
                        {" / "}
                        <span className="text-destructive">{rule.jobCounts.failed}</span>
                        {" / "}
                        {rule.jobCounts.total}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={rule.enabled ? "default" : "secondary"}>
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(rule)}
                      >
                        {rule.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(rule)}
                        title="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {!rule.builtIn && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(rule)}
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
