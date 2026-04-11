"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Send, MessageSquareText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CommentContent } from "@/components/tickets/comment-content";
import type { UserOption } from "@/modules/tickets/types";

type CannedResponse = {
  id: string;
  title: string;
  content: string;
  category: string | null;
};

type CommentFormProps = {
  ticketId: string;
  users?: UserOption[];
  isStaff?: boolean;
};

export function CommentForm({ ticketId, users = [], isStaff = false }: CommentFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [showCanned, setShowCanned] = useState(false);

  useEffect(() => {
    if (!isStaff) return;
    fetch("/api/canned-responses")
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.responses) setCannedResponses(json.data.responses);
      })
      .catch(() => {});
  }, [isStaff]);

  const filteredUsers = mentionQuery !== null
    ? users.filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : [];

  const handleChange = useCallback((value: string) => {
    setContent(value);

    // Detect @mention in progress
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const textBefore = value.slice(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }, []);

  function insertMention(name: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const textBefore = content.slice(0, cursor);
    const textAfter = content.slice(cursor);
    const atPos = textBefore.lastIndexOf("@");

    const mention = name.includes(" ") ? `@"${name}"` : `@${name}`;
    const newContent = textBefore.slice(0, atPos) + mention + " " + textAfter;

    setContent(newContent);
    setMentionQuery(null);

    // Refocus textarea
    setTimeout(() => {
      textarea.focus();
      const newCursor = atPos + mention.length + 1;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (mentionQuery === null || filteredUsers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % filteredUsers.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((i) => (i - 1 + filteredUsers.length) % filteredUsers.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(filteredUsers[mentionIndex].name);
    } else if (e.key === "Escape") {
      setMentionQuery(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { success: boolean; error?: { message?: string } }
        | null;

      if (!response.ok || !payload?.success) {
        toast.error(payload?.error?.message ?? "Unable to add comment.");
        return;
      }

      setContent("");
      toast.success("Comment added.");
      router.refresh();
    });
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
      <div className="flex gap-1 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setShowPreview(false)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${!showPreview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${showPreview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Preview
        </button>
      </div>

      {showPreview ? (
        <div className="min-h-[100px] rounded-lg border border-border bg-muted/30 p-3">
          {content.trim() ? (
            <CommentContent content={content} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview.</p>
          )}
        </div>
      ) : (
      <div className="relative">
        <Textarea
          ref={textareaRef}
          className="min-h-[100px] resize-none"
          placeholder="Markdown supported. Use @name to mention someone"
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* @mention dropdown */}
        {mentionQuery !== null && filteredUsers.length > 0 && (
          <div className="absolute left-0 top-0 z-20 -translate-y-full w-64 rounded-lg border border-border bg-card p-1 shadow-dropdown">
            {filteredUsers.map((user, i) => (
              <button
                key={user.id}
                type="button"
                className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                  i === mentionIndex ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(user.name);
                }}
                onMouseEnter={() => setMentionIndex(i)}
              >
                <div
                  className="flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: `hsl(${(user.name.charCodeAt(0) * 37) % 360}, 50%, 55%)` }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Markdown supported. Type <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-medium">@</kbd> to mention
          </p>
          {isStaff && cannedResponses.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCanned((v) => !v)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <MessageSquareText className="size-3" />
                Quick replies
              </button>
              {showCanned && (
                <div className="absolute bottom-full left-0 z-20 mb-1 w-72 rounded-lg border border-border bg-card p-1 shadow-dropdown max-h-60 overflow-y-auto">
                  {cannedResponses.map((cr) => (
                    <button
                      key={cr.id}
                      type="button"
                      className="flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setContent((prev) => (prev ? prev + "\n\n" + cr.content : cr.content));
                        setShowCanned(false);
                        textareaRef.current?.focus();
                      }}
                    >
                      <span className="text-sm font-medium text-foreground">{cr.title}</span>
                      {cr.category && (
                        <span className="text-[10px] text-muted-foreground">{cr.category}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <Button disabled={isPending || content.trim().length === 0} type="submit">
          <Send className="size-3.5" data-icon="inline-start" />
          {isPending ? "Posting..." : "Add comment"}
        </Button>
      </div>
    </form>
  );
}
