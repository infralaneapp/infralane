"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { UserOption } from "@/modules/tickets/types";

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
        setError(payload?.error?.message ?? "Unable to update assignee.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <select className="input-control" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
        <option value="">Unassigned</option>
        {assignees.map((assignee) => (
          <option key={assignee.id} value={assignee.id}>
            {assignee.name}
          </option>
        ))}
      </select>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button className="button-primary w-full" disabled={isPending} type="submit">
        {isPending ? "Saving..." : "Update assignee"}
      </button>
    </form>
  );
}
