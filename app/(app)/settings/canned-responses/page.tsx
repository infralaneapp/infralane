"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string | null;
  createdAt: string;
}

export default function CannedResponsesPage() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, dialogProps } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchResponses = useCallback(async () => {
    try {
      const res = await fetch("/api/canned-responses");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setResponses(json.data.responses);
    } catch {
      toast.error("Could not load canned responses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  function resetForm() {
    setTitle("");
    setCategory("");
    setContent("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(r: CannedResponse) {
    setEditingId(r.id);
    setTitle(r.title);
    setCategory(r.category ?? "");
    setContent(r.content);
    setShowForm(true);
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = { title, content };
      if (category.trim()) body.category = category;

      const isEdit = !!editingId;
      const res = await fetch(
        isEdit ? `/api/canned-responses/${editingId}` : "/api/canned-responses",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? "Save failed.");
      }
      toast.success(isEdit ? "Quick reply updated." : "Quick reply created.");
      resetForm();
      fetchResponses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: "Delete quick reply?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/canned-responses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Quick reply deleted.");
      fetchResponses();
    } catch {
      toast.error("Could not delete quick reply.");
    }
  }

  if (loading) {
    return (
      <Card className="p-8 shadow-card">
        <p className="text-sm text-muted-foreground">Loading quick replies...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {responses.length} quick repl{responses.length !== 1 ? "ies" : "y"}
        </p>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="size-4" data-icon="inline-start" />
            Create quick reply
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {editingId ? "Edit Quick Reply" : "New Quick Reply"}
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={resetForm}>
              <X className="size-4" />
            </Button>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cr-title">Title</Label>
              <Input
                id="cr-title"
                placeholder="e.g. Password reset instructions"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-category">Category (optional)</Label>
              <Input
                id="cr-category"
                placeholder="e.g. Account, Billing"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cr-content">Content</Label>
            <textarea
              id="cr-content"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Reply content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <Card className="shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Content</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No quick replies yet. Create your first one.
                </TableCell>
              </TableRow>
            ) : (
              responses.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.title}</TableCell>
                  <TableCell className="text-muted-foreground">{r.category ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                    {r.content.length > 80 ? r.content.slice(0, 80) + "..." : r.content}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => startEdit(r)} title="Edit">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(r.id)}
                        title="Delete"
                        className="text-destructive hover:text-destructive"
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
    </div>
  );
}
