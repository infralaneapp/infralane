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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  published: boolean;
  viewCount: number;
  createdAt: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, dialogProps } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  const fetchArticles = useCallback(async () => {
    try {
      // Fetch all articles (including unpublished) by calling our own admin-aware endpoint
      // The GET /api/knowledge-base only returns published ones, so we need a workaround
      // We'll fetch published and then also handle that admins see all via the same list
      const res = await fetch("/api/knowledge-base?_admin=1");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setArticles(json.data.articles);
    } catch {
      toast.error("Could not load articles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  function resetForm() {
    setTitle("");
    setSlug("");
    setContent("");
    setCategory("");
    setPublished(false);
    setEditingSlug(null);
    setShowForm(false);
    setAutoSlug(true);
  }

  function startEdit(a: Article) {
    setEditingSlug(a.slug);
    setTitle(a.title);
    setSlug(a.slug);
    setContent(a.content);
    setCategory(a.category ?? "");
    setPublished(a.published);
    setAutoSlug(false);
    setShowForm(true);
  }

  function handleTitleChange(val: string) {
    setTitle(val);
    if (autoSlug && !editingSlug) {
      setSlug(slugify(val));
    }
  }

  async function handleSave() {
    if (!title.trim() || !slug.trim() || !content.trim()) {
      toast.error("Title, slug, and content are required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title,
        slug,
        content,
        category: category.trim() || undefined,
        published,
      };

      const isEdit = !!editingSlug;
      const res = await fetch(
        isEdit ? `/api/knowledge-base/${editingSlug}` : "/api/knowledge-base",
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
      toast.success(isEdit ? "Article updated." : "Article created.");
      resetForm();
      fetchArticles();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(slug: string) {
    const confirmed = await confirm({
      title: "Delete article?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/knowledge-base/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Article deleted.");
      fetchArticles();
    } catch {
      toast.error("Could not delete article.");
    }
  }

  if (loading) {
    return (
      <Card className="p-8 shadow-card">
        <p className="text-sm text-muted-foreground">Loading articles...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {articles.length} article{articles.length !== 1 ? "s" : ""}
        </p>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="size-4" data-icon="inline-start" />
            Create article
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {editingSlug ? "Edit Article" : "New Article"}
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={resetForm}>
              <X className="size-4" />
            </Button>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kb-title">Title</Label>
              <Input
                id="kb-title"
                placeholder="e.g. How to reset your password"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kb-slug">Slug</Label>
              <Input
                id="kb-slug"
                placeholder="e.g. how-to-reset-password"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setAutoSlug(false);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kb-category">Category (optional)</Label>
              <Input
                id="kb-category"
                placeholder="e.g. Account, Billing"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none self-end pb-1">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="accent-primary size-3.5"
              />
              <span className="text-sm text-muted-foreground">Published</span>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kb-content">Content</Label>
            <textarea
              id="kb-content"
              className="flex min-h-[180px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Article content (Markdown supported)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingSlug ? "Update" : "Create"}
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
              <TableHead>Slug</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Views</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No articles yet. Create your first one.
                </TableCell>
              </TableRow>
            ) : (
              articles.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-foreground">{a.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.slug}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.category ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={a.published ? "default" : "secondary"}>
                      {a.published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {a.viewCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => startEdit(a)} title="Edit">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(a.slug)}
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
