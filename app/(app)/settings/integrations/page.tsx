"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type SlackConfig = {
  webhookUrl: string;
  botToken: string;
  signingSecret: string;
  defaultChannel: string;
};

type Integration = {
  id: string;
  provider: string;
  config: SlackConfig;
  enabled: boolean;
};

type WebhookEndpoint = {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  payloadTemplate: string | null;
  allowedDomains: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function IntegrationsPage() {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const { confirm, dialogProps } = useConfirm();
  const [saving, setSaving] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [botToken, setBotToken] = useState("");
  const [signingSecret, setSigningSecret] = useState("");
  const [defaultChannel, setDefaultChannel] = useState("");
  const [enabled, setEnabled] = useState(false);

  // SMTP status
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);

  // Webhook endpoints state
  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpoint[]>([]);
  const [whLoading, setWhLoading] = useState(true);
  const [showWhForm, setShowWhForm] = useState(false);
  const [editingWh, setEditingWh] = useState<WebhookEndpoint | null>(null);
  const [whName, setWhName] = useState("");
  const [whUrl, setWhUrl] = useState("");
  const [whMethod, setWhMethod] = useState("POST");
  const [whEnabled, setWhEnabled] = useState(true);
  const [whSaving, setWhSaving] = useState(false);

  const fetchWebhookEndpoints = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/webhooks");
      if (!res.ok) return;
      const json = await res.json();
      if (json.data?.webhooks) setWebhookEndpoints(json.data.webhooks);
    } catch {
      // ignore
    } finally {
      setWhLoading(false);
    }
  }, []);

  const fetchIntegration = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/integrations?provider=slack");
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data?.integration;
      if (data) {
        setIntegration(data);
        setWebhookUrl(data.config?.webhookUrl ?? "");
        setBotToken(data.config?.botToken ?? "");
        setSigningSecret(data.config?.signingSecret ?? "");
        setDefaultChannel(data.config?.defaultChannel ?? "");
        setEnabled(data.enabled);
      }
    } catch {
      // No integration configured yet
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSmtpStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/email-status");
      if (!res.ok) return;
      const json = await res.json();
      setSmtpConfigured(json.data.configured);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { fetchIntegration(); fetchWebhookEndpoints(); fetchSmtpStatus(); }, [fetchIntegration, fetchWebhookEndpoints, fetchSmtpStatus]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "slack",
          config: { webhookUrl, botToken, signingSecret, defaultChannel },
          enabled,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Slack integration saved.");
      fetchIntegration();
    } catch {
      toast.error("Could not save integration.");
    } finally {
      setSaving(false);
    }
  }

  function resetWhForm() {
    setWhName("");
    setWhUrl("");
    setWhMethod("POST");
    setWhEnabled(true);
    setEditingWh(null);
    setShowWhForm(false);
  }

  function startEditWh(wh: WebhookEndpoint) {
    setEditingWh(wh);
    setWhName(wh.name);
    setWhUrl(wh.url);
    setWhMethod(wh.method);
    setWhEnabled(wh.enabled);
    setShowWhForm(true);
  }

  async function handleWhSave() {
    setWhSaving(true);
    try {
      const body = { name: whName, url: whUrl, method: whMethod, enabled: whEnabled };
      const isEdit = !!editingWh;
      const res = await fetch(
        isEdit ? `/api/settings/webhooks/${editingWh!.id}` : "/api/settings/webhooks",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error("Save failed");
      toast.success(isEdit ? "Webhook updated." : "Webhook created.");
      resetWhForm();
      fetchWebhookEndpoints();
    } catch {
      toast.error("Could not save webhook endpoint.");
    } finally {
      setWhSaving(false);
    }
  }

  async function handleWhDelete(id: string) {
    const confirmed = await confirm({
      title: "Delete webhook endpoint?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/settings/webhooks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Webhook deleted.");
      fetchWebhookEndpoints();
    } catch {
      toast.error("Could not delete webhook endpoint.");
    }
  }

  if (loading) {
    return <Card className="p-8 shadow-card"><p className="text-sm text-muted-foreground">Loading...</p></Card>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">Integrations</h2>

      <Card className="p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Slack</h3>
            <p className="text-xs text-muted-foreground">Send notifications and approval requests to Slack.</p>
          </div>
          <Badge variant={enabled ? "default" : "secondary"}>
            {enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="slack-webhook">Incoming Webhook URL</Label>
            <Input
              id="slack-webhook"
              placeholder="https://hooks.slack.com/services/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slack-bot-token">Bot Token</Label>
            <Input
              id="slack-bot-token"
              placeholder="xoxb-..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              type="password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slack-signing">Signing Secret</Label>
            <Input
              id="slack-signing"
              placeholder="Signing secret for interactive messages"
              value={signingSecret}
              onChange={(e) => setSigningSecret(e.target.value)}
              type="password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slack-channel">Default Channel</Label>
            <Input
              id="slack-channel"
              placeholder="#ops-alerts"
              value={defaultChannel}
              onChange={(e) => setDefaultChannel(e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="accent-primary size-3.5"
          />
          <span className="text-sm text-muted-foreground">Enable Slack integration</span>
        </label>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </Card>

      {/* Webhook Endpoints */}
      <Card className="p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Webhook Endpoints</h3>
            <p className="text-xs text-muted-foreground">Configure outgoing webhook endpoints for automation actions.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { resetWhForm(); setShowWhForm(true); }}
          >
            <Plus className="size-3.5 mr-1" />
            Add
          </Button>
        </div>

        <Separator />

        {whLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : webhookEndpoints.length === 0 && !showWhForm ? (
          <p className="text-sm text-muted-foreground">No webhook endpoints configured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">URL</th>
                  <th className="pb-2 pr-4">Method</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhookEndpoints.map((wh) => (
                  <tr key={wh.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{wh.name}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground truncate max-w-[200px]">{wh.url}</td>
                    <td className="py-2.5 pr-4">
                      <Badge variant="outline">{wh.method}</Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={wh.enabled ? "default" : "secondary"}>
                        {wh.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEditWh(wh)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleWhDelete(wh.id)}>
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showWhForm && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-xs font-medium text-foreground">{editingWh ? "Edit endpoint" : "New endpoint"}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="wh-name">Name</Label>
                  <Input id="wh-name" placeholder="My Webhook" value={whName} onChange={(e) => setWhName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wh-url">URL</Label>
                  <Input id="wh-url" placeholder="https://example.com/hook" value={whUrl} onChange={(e) => setWhUrl(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wh-method">Method</Label>
                  <select
                    id="wh-method"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={whMethod}
                    onChange={(e) => setWhMethod(e.target.value)}
                  >
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="GET">GET</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none self-end pb-1">
                  <input type="checkbox" checked={whEnabled} onChange={(e) => setWhEnabled(e.target.checked)} className="accent-primary size-3.5" />
                  <span className="text-sm text-muted-foreground">Enabled</span>
                </label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleWhSave} disabled={whSaving || !whName.trim() || !whUrl.trim()}>
                  {whSaving ? "Saving..." : editingWh ? "Update" : "Create"}
                </Button>
                <Button variant="outline" onClick={resetWhForm}>Cancel</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Email / SMTP */}
      <Card className="p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Email / SMTP</h3>
            <p className="text-xs text-muted-foreground">SMTP is configured via environment variables on the server.</p>
          </div>
          {smtpConfigured !== null && (
            <Badge variant={smtpConfigured ? "default" : "secondary"}>
              {smtpConfigured ? "Configured" : "Not configured"}
            </Badge>
          )}
        </div>

        <Separator />

        <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-2">
          <p className="text-sm font-medium text-foreground">Required environment variables:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">SMTP_HOST</code> — SMTP server hostname</li>
            <li><code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">SMTP_PORT</code> — SMTP server port (e.g. 587)</li>
            <li><code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">SMTP_USER</code> — SMTP username</li>
            <li><code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">SMTP_PASS</code> — SMTP password</li>
            <li><code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">SMTP_FROM</code> — Default sender address</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            Set these variables in your deployment environment or <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">.env</code> file and restart the application.
          </p>
        </div>
      </Card>
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
