"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { TICKET_STATUS_VALUES } from "@/modules/tickets/constants";
import { formatTicketStatus } from "@/lib/formatters";
import type { TicketStatusValue } from "@/modules/tickets/types";

type StatusFormProps = {
  ticketId: string;
  currentStatus: TicketStatusValue;
};

export function StatusForm({ ticketId, currentStatus }: StatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<TicketStatusValue>(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setError(null);

      const response = await fetch(`/api/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
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
        setError(payload?.error?.message ?? "Unable to update status.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <select className="input-control" value={status} onChange={(event) => setStatus(event.target.value as TicketStatusValue)}>
        {TICKET_STATUS_VALUES.map((statusOption) => (
          <option key={statusOption} value={statusOption}>
            {formatTicketStatus(statusOption)}
          </option>
        ))}
      </select>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button className="button-primary w-full" disabled={isPending} type="submit">
        {isPending ? "Saving..." : "Update status"}
      </button>
    </form>
  );
}
