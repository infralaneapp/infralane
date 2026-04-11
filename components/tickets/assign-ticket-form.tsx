"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { UserOption } from "@/modules/tickets/types";
import { Button } from "@/components/ui/button";

type AssignTicketFormProps = {
  ticketId: string;
  currentAssigneeId: string | null;
  assignees: UserOption[];
};

export function AssignTicketForm({ ticketId, currentAssigneeId, assignees }: AssignTicketFormProps) {
  const router = useRouter();
  const [assigneeId, setAssigneeId] = useState(currentAssigneeId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setError(null);

      const response = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assigneeId: assigneeId || null,
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
        toast.error(payload?.error?.message ?? "Unable to update assignee.");
        return;
      }

      toast.success("Assignee updated.");
      router.refresh();
    });
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <select
        className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        value={assigneeId}
        onChange={(event) => setAssigneeId(event.target.value)}
      >
        <option value="">Unassigned</option>
        {assignees.map((assignee) => (
          <option key={assignee.id} value={assignee.id}>
            {assignee.name}
          </option>
        ))}
      </select>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Saving..." : "Update assignee"}
      </Button>
    </form>
  );
}
