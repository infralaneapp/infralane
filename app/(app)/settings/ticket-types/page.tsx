"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Archive,
  Trash2,
  X,
  GripVertical,
} from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { Textarea } from "@/components/ui/textarea";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
}

interface TicketType {
  id: string;
  key: string;
  name: string;
  description: string | null;
  archived: boolean;
  fieldSchema: FieldDef[];
  _count?: { tickets: number };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function emptyField(): FieldDef {
  return { key: "", label: "", type: "text", required: false, options: [] };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function TicketTypesPage() {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, dialogProps } = useConfirm();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TicketType | null>(null);

  // Form state
  const [formKey, setFormKey] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFields, setFormFields] = useState<FieldDef[]>([]);
  const [saving, setSaving] = useState(false);

  /* ---------------------------------------------------------------------- */
  /*  Fetch                                                                 */
  /* ---------------------------------------------------------------------- */

  const fetchTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/ticket-types");
      if (!res.ok) throw new Error("Failed to fetch ticket types.");
      const json = await res.json();
      setTicketTypes(json.data.ticketTypes);
    } catch {
      toast.error("Could not load ticket types.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  /* ---------------------------------------------------------------------- */
  /*  Open dialog                                                           */
  /* ---------------------------------------------------------------------- */

  function openCreate() {
    setEditing(null);
    setFormKey("");
    setFormName("");
    setFormDescription("");
    setFormFields([emptyField()]);
    setDialogOpen(true);
  }

  function openEdit(tt: TicketType) {
    setEditing(tt);
    setFormKey(tt.key);
    setFormName(tt.name);
    setFormDescription(tt.description ?? "");
    setFormFields(
      tt.fieldSchema.length > 0
        ? tt.fieldSchema.map((f) => ({ ...f }))
        : [emptyField()]
    );
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

    const cleanedFields = formFields.filter((f) => f.key.trim() && f.label.trim());

    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/settings/ticket-types/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            description: formDescription || undefined,
            fieldSchema: cleanedFields,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error ?? "Update failed.");
        }
        toast.success("Ticket type updated.");
      } else {
        if (!formKey.trim()) {
          toast.error("Key is required.");
          setSaving(false);
          return;
        }
        const res = await fetch("/api/settings/ticket-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: formKey,
            name: formName,
            description: formDescription || undefined,
            fieldSchema: cleanedFields,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error ?? "Create failed.");
        }
        toast.success("Ticket type created.");
      }
      setDialogOpen(false);
      fetchTypes();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  Archive / Delete                                                      */
  /* ---------------------------------------------------------------------- */

  async function handleArchive(tt: TicketType) {
    try {
      const res = await fetch(`/api/settings/ticket-types/${tt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !tt.archived }),
      });
      if (!res.ok) throw new Error("Failed to update.");
      toast.success(tt.archived ? "Ticket type restored." : "Ticket type archived.");
      fetchTypes();
    } catch {
      toast.error("Could not update ticket type.");
    }
  }

  async function handleDelete(tt: TicketType) {
    const confirmed = await confirm({
      title: `Delete "${tt.name}"?`,
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/settings/ticket-types/${tt.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete.");
      toast.success("Ticket type deleted.");
      fetchTypes();
    } catch {
      toast.error("Could not delete ticket type.");
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  Field schema helpers                                                  */
  /* ---------------------------------------------------------------------- */

  function updateField(index: number, patch: Partial<FieldDef>) {
    setFormFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
  }

  function removeField(index: number) {
    setFormFields((prev) => prev.filter((_, i) => i !== index));
  }

  function addField() {
    setFormFields((prev) => [...prev, emptyField()]);
  }

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <Card className="p-8 shadow-card">
        <p className="text-sm text-muted-foreground">Loading ticket types...</p>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {ticketTypes.length} ticket type{ticketTypes.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openCreate}>
          <Plus className="size-4" data-icon="inline-start" />
          Create type
        </Button>
      </div>

      <Card className="mt-4 shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="text-center">Fields</TableHead>
              <TableHead className="text-center">Tickets</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No ticket types yet. Create your first one.
                </TableCell>
              </TableRow>
            ) : (
              ticketTypes.map((tt) => (
                <TableRow key={tt.id}>
                  <TableCell className="font-medium text-foreground">
                    {tt.name}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {tt.key}
                    </code>
                  </TableCell>
                  <TableCell className="hidden max-w-[240px] truncate text-muted-foreground md:table-cell">
                    {tt.description ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {tt.fieldSchema.length}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {tt._count?.tickets ?? 0}
                  </TableCell>
                  <TableCell className="text-center">
                    {tt.archived ? (
                      <Badge variant="secondary">Archived</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(tt)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleArchive(tt)}
                      >
                        <Archive className="size-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => handleDelete(tt)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <ConfirmDialog {...dialogProps} />

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit ticket type" : "Create ticket type"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the name, description, or field schema."
                : "Define a new ticket type with custom fields."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Key (create only) */}
            {!editing && (
              <div className="space-y-1.5">
                <Label htmlFor="tt-key">Key</Label>
                <Input
                  id="tt-key"
                  placeholder="e.g. access_request"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase alphanumeric with underscores. Cannot be changed later.
                </p>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="tt-name">Name</Label>
              <Input
                id="tt-name"
                placeholder="Access request"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="tt-desc">Description</Label>
              <Textarea
                id="tt-desc"
                placeholder="Short description of this ticket type."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>

            <Separator />

            {/* Field schema builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Field schema</Label>
                <Button variant="outline" size="sm" onClick={addField}>
                  <Plus className="size-3.5" data-icon="inline-start" />
                  Add field
                </Button>
              </div>

              {formFields.map((field, idx) => (
                <Card key={idx} className="p-3 shadow-none border space-y-3">
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-2 size-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Key</Label>
                        <Input
                          placeholder="field_key"
                          value={field.key}
                          onChange={(e) =>
                            updateField(idx, { key: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input
                          placeholder="Field label"
                          value={field.label}
                          onChange={(e) =>
                            updateField(idx, { label: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="mt-5 shrink-0"
                      onClick={() => removeField(idx)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>

                  <div className="ml-6 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={field.type ?? "text"}
                        onValueChange={(val) => {
                          if (val) updateField(idx, { type: val as FieldDef["type"] });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="textarea">Textarea</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2 pb-0.5">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={field.required ?? false}
                          onChange={(e) =>
                            updateField(idx, { required: e.target.checked })
                          }
                          className="accent-primary size-3.5"
                        />
                        Required
                      </label>
                    </div>
                  </div>

                  {field.type === "select" && (
                    <div className="ml-6 space-y-1">
                      <Label className="text-xs">Options (comma-separated)</Label>
                      <Input
                        placeholder="option1, option2, option3"
                        value={(field.options ?? []).join(", ")}
                        onChange={(e) =>
                          updateField(idx, {
                            options: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </div>
                  )}
                </Card>
              ))}

              {formFields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No fields defined. Click "Add field" to start.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
