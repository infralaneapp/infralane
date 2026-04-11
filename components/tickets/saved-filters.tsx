"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SavedFilter = {
  id: string;
  name: string;
  query: string;
};

export function SavedFilters() {
  const router = useRouter();
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [open, setOpen] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchFilters = useCallback(async () => {
    try {
      const res = await fetch("/api/saved-filters");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFilters(data.data?.filters ?? data.filters ?? []);
    } catch {
      toast.error("Failed to load saved filters.");
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  function applyFilter(filter: SavedFilter) {
    router.push(`?${filter.query}`);
    setOpen(false);
  }

  async function saveCurrentFilter(e: React.FormEvent) {
    e.preventDefault();
    const name = filterName.trim();
    if (!name) return;

    setSaving(true);
    try {
      const query =
        typeof window !== "undefined" ? window.location.search.slice(1) : "";

      const res = await fetch("/api/saved-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, query }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(`Filter "${name}" saved.`);
      setFilterName("");
      setShowSave(false);
      await fetchFilters();
    } catch {
      toast.error("Failed to save filter.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFilter(filterId: string, filterName: string) {
    try {
      const res = await fetch(`/api/saved-filters/${filterId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setFilters((prev) => prev.filter((f) => f.id !== filterId));
      toast.success(`Filter "${filterName}" deleted.`);
    } catch {
      toast.error("Failed to delete filter.");
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen((v) => !v);
          setShowSave(false);
        }}
      >
        <Bookmark className="size-3.5" data-icon="inline-start" />
        Saved Filters
        {filters.length > 0 && (
          <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
            {filters.length}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-72 rounded-lg border border-border bg-card p-2 shadow-md">
          {/* Close button */}
          <div className="mb-1 flex items-center justify-between">
            <span className="px-1 text-xs font-medium text-muted-foreground">
              Saved Filters
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="size-3" />
            </button>
          </div>

          {/* Filter list */}
          {filters.length > 0 ? (
            <ul className="space-y-0.5">
              {filters.map((filter) => (
                <li
                  key={filter.id}
                  className="flex items-center justify-between gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <button
                    type="button"
                    onClick={() => applyFilter(filter)}
                    className="flex-1 truncate text-left text-foreground"
                  >
                    {filter.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFilter(filter.id, filter.name)}
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No saved filters yet.
            </p>
          )}

          {/* Save current */}
          <div className="mt-2 border-t border-border pt-2">
            {showSave ? (
              <form onSubmit={saveCurrentFilter} className="flex gap-1.5">
                <Input
                  placeholder="Filter name"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="h-7 flex-1 text-xs"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="xs"
                  disabled={!filterName.trim() || saving}
                >
                  {saving ? "..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowSave(false)}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                className="w-full"
                onClick={() => setShowSave(true)}
              >
                <Plus className="size-3" data-icon="inline-start" />
                Save current filters
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
