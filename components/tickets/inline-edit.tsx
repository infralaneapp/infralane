"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type InlineEditProps = {
  ticketId: string;
  field: "title" | "description";
  value: string;
  multiline?: boolean;
};

export function InlineEdit({
  ticketId,
  field,
  value,
  multiline = false,
}: InlineEditProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      // Move cursor to end
      const len = draft.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  function startEditing() {
    setDraft(value);
    setEditing(true);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function save() {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }

    if (field === "title" && !trimmed) {
      toast.error("Title cannot be empty.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/tickets/${ticketId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: trimmed }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error?.message ?? "Failed to save");
        }

        toast.success(`${field === "title" ? "Title" : "Description"} updated.`);
        setEditing(false);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save changes."
        );
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      save();
    }
    // For multiline, Ctrl/Cmd+Enter to save
    if (e.key === "Enter" && multiline && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
  }

  if (editing) {
    return multiline ? (
      <Textarea
        ref={inputRef as React.Ref<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        className="min-h-[80px] resize-y text-sm"
      />
    ) : (
      <Input
        ref={inputRef as React.Ref<HTMLInputElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        className="text-sm"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className={cn(
        "group/inline-edit inline-flex w-full items-start gap-1.5 rounded-md text-left transition-colors hover:bg-muted/60",
        multiline ? "p-2" : "px-2 py-1"
      )}
    >
      <span
        className={cn(
          "flex-1",
          field === "title" && "font-medium",
          !value && "text-muted-foreground"
        )}
      >
        {value || `Add ${field}...`}
      </span>
      <Pencil className="mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/inline-edit:opacity-100" />
    </button>
  );
}
