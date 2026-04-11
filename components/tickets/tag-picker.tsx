"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tag, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TagData = {
  id: string;
  name: string;
  color: string;
};

type TicketTag = {
  id: string;
  tag: TagData;
};

type TagPickerProps = {
  ticketId: string;
  currentTags: TicketTag[];
};

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export function TagPicker({ ticketId, currentTags }: TagPickerProps) {
  const router = useRouter();
  const [tags, setTags] = useState<TicketTag[]>(currentTags);
  const [availableTags, setAvailableTags] = useState<TagData[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [isPending, startTransition] = useTransition();

  const fetchAvailableTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error("Failed to fetch tags");
      const data = await res.json();
      setAvailableTags(data.data?.tags ?? data.tags ?? []);
    } catch {
      toast.error("Failed to load tags.");
    }
  }, []);

  useEffect(() => {
    fetchAvailableTags();
  }, [fetchAvailableTags]);

  useEffect(() => {
    setTags(currentTags);
  }, [currentTags]);

  function isTagApplied(tagId: string) {
    return tags.some((t) => t.tag.id === tagId);
  }

  function handleAddTag(tag: TagData) {
    if (isTagApplied(tag.id)) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/tickets/${ticketId}/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagId: tag.id }),
        });
        if (!res.ok) throw new Error("Failed to add tag");
        const data = await res.json();
        setTags((prev) => [...prev, data.ticketTag ?? { id: data.id ?? tag.id, tag }]);
        toast.success(`Tag "${tag.name}" added.`);
        router.refresh();
      } catch {
        toast.error("Failed to add tag.");
      }
    });
  }

  function handleRemoveTag(ticketTag: TicketTag) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tickets/${ticketId}/tags/${ticketTag.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to remove tag");
        setTags((prev) => prev.filter((t) => t.id !== ticketTag.id));
        toast.success(`Tag "${ticketTag.tag.name}" removed.`);
        router.refresh();
      } catch {
        toast.error("Failed to remove tag.");
      }
    });
  }

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, color: newTagColor }),
      });
      if (!res.ok) throw new Error("Failed to create tag");
      const data = await res.json();
      const created: TagData = data.data?.tag ?? data.tag ?? data;
      setAvailableTags((prev) => [...prev, created]);
      setNewTagName("");
      setShowCreate(false);
      toast.success(`Tag "${created.name}" created.`);
    } catch {
      toast.error("Failed to create tag.");
    }
  }

  const unselectedTags = availableTags.filter((t) => !isTagApplied(t.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Tag className="size-3.5 text-muted-foreground" />
        <span className="text-sm font-medium">Tags</span>
      </div>

      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tt) => (
          <Badge
            key={tt.id}
            variant="secondary"
            className="gap-1 pr-1"
            style={{
              backgroundColor: `${tt.tag.color}20`,
              color: tt.tag.color,
              borderColor: `${tt.tag.color}40`,
            }}
          >
            {tt.tag.name}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleRemoveTag(tt)}
              className="ml-0.5 inline-flex size-3.5 items-center justify-center rounded-full hover:bg-black/10"
            >
              <X className="size-2.5" />
            </button>
          </Badge>
        ))}

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => {
            setShowPicker((v) => !v);
            setShowCreate(false);
          }}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Tag picker dropdown */}
      {showPicker && (
        <div className="rounded-lg border border-border bg-card p-2 shadow-sm">
          {unselectedTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {unselectedTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleAddTag(tag)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
                  style={{ color: tag.color }}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No more tags available.</p>
          )}

          <div className="mt-2 border-t border-border pt-2">
            {showCreate ? (
              <form onSubmit={handleCreateTag} className="space-y-2">
                <Input
                  placeholder="Tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="h-7 text-xs"
                />
                <div className="flex items-center gap-1.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTagColor(color)}
                      className="size-5 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: newTagColor === color ? "white" : "transparent",
                        boxShadow:
                          newTagColor === color ? `0 0 0 2px ${color}` : "none",
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Button type="submit" size="xs" disabled={!newTagName.trim()}>
                    Create
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="size-3" data-icon="inline-start" />
                Create tag
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
