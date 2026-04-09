"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type CommentFormProps = {
  ticketId: string;
};

export function CommentForm({ ticketId }: CommentFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setError(null);

      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            success: boolean;
            error?: {
              message?: string;
            };
          }
        | null;

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? "Unable to add comment.");
        return;
      }

      setContent("");
      router.refresh();
    });
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
      <textarea
        className="input-control min-h-[120px]"
        placeholder="Add context, decisions, or requester follow-up."
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex justify-end">
        <button className="button-primary" disabled={isPending || content.trim().length === 0} type="submit">
          {isPending ? "Posting..." : "Add comment"}
        </button>
      </div>
    </form>
  );
}
