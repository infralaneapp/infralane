"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

interface TicketTypeRef {
  id: string;
  key: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  ticketTypeId: string;
  ticketType: TicketTypeRef;
  priority: string;
  title: string | null;
  body: string | null;
  fieldValues: Record<string, string>;
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeRef[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTypeId, setFormTypeId] = useState("");
  const [formPriority, setFormPriority] = useState<string>("MEDIUM");
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formFieldValues, setFormFieldValues] = useState<Record<string, string>>({});

  /* ---------------------------------------------------------------------- */
  /*  Fetch                                                                 */
  /* ---------------------------------------------------------------------- */

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/templates");
      if (!res.ok) throw new Error("Failed to fetch templates.");
      const json = await res.json();
      setTemplates(json.data.templates);
    } catch {
      toast.error("Could not load templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTicketTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/ticket-types");
      if (!res.ok) return;
      const json = await res.json();
      setTicketTypes(
        (json.data.ticketTypes as Array<{ id: string; key: string; name: string }>).map(
          (t) => ({ id: t.id, key: t.key, name: t.name })
        )
      );
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchTicketTypes();
  }, [fetchTemplates, fetchTicketTypes]);

  /* ---------------------------------------------------------------------- */
  /*  Open dialog                                                           */
  /* ---------------------------------------------------------------------- */

  function openCreate() {
    setFormName("");
    setFormDescription("");
    setFormTypeId(ticketTypes[0]?.id ?? "");
    setFormPriority("MEDIUM");
    setFormTitle("");
    setFormBody("");
    setFormFieldValues({});
    setDialogOpen(true);
  }

  /* ---------------------------------------------------------------------- */
  /*  Save                                                                  */
  /* ---------------------------------------------------------------------- */

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!formTypeId) {
      toast.error("Ticket type is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          ticketTypeId: formTypeId,
          priority: formPriority,
          title: formTitle || undefined,
          body: formBody || undefined,
          fieldValues: formFieldValues,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Create failed.");
      }
      toast.success("Template created.");
      setDialogOpen(false);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <Card className="p-8 shadow-card">
        <p className="text-sm text-muted-foreground">Loading templates...</p>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openCreate}>
          <Plus className="size-4" data-icon="inline-start" />
          Create template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="mt-4 p-8 shadow-card text-center">
          <FileText className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No templates yet. Create one to speed up ticket creation.
          </p>
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="p-4 shadow-card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {tpl.name}
                  </h3>
                  {tpl.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {tpl.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">{tpl.ticketType.name}</Badge>
                <Badge variant="outline">
                  {PRIORITY_LABELS[tpl.priority] ?? tpl.priority}
                </Badge>
              </div>

              {tpl.title && (
                <p className="text-xs text-muted-foreground truncate">
                  Title: {tpl.title}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create template</DialogTitle>
            <DialogDescription>
              Pre-fill ticket fields to speed up common requests.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Name</Label>
              <Input
                id="tpl-name"
                placeholder="e.g. Standard access request"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc">Description</Label>
              <Input
                id="tpl-desc"
                placeholder="Optional description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ticket type</Label>
                <Select value={formTypeId} onValueChange={(v) => v && setFormTypeId(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={formPriority} onValueChange={(v) => v && setFormPriority(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="tpl-title">Title pre-fill</Label>
              <Input
                id="tpl-title"
                placeholder="Pre-filled ticket title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-body">Body pre-fill</Label>
              <Textarea
                id="tpl-body"
                placeholder="Pre-filled ticket description"
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
