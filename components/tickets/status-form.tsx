"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { TICKET_STATUS_VALUES } from "@/modules/tickets/constants";
import { formatTicketStatus } from "@/lib/formatters";
import type { TicketStatusValue } from "@/modules/tickets/types";
import { Button } from "@/components/ui/button";

type StatusFormProps = {
  ticketId: string;
  currentStatus: TicketStatusValue;
  hasPendingApproval?: boolean;
};

export function StatusForm({ ticketId, currentStatus, hasPendingApproval }: StatusFormProps) {
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
              code?: string;
            };
          }
        | null;

      if (!response.ok || !payload?.success) {
        const msg = payload?.error?.message ?? "Unable to update status.";
        setError(msg);
        toast.error(msg);
        return;
      }

      setError(null);
      toast.success("Status updated.");
      router.refresh();
    });
  }

  if (hasPendingApproval) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-800 dark:bg-amber-950/30">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <ShieldAlert className="size-4 shrink-0" />
          <p className="text-sm font-medium">Pending approval</p>
        </div>
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
          Status changes are locked until the approval request is decided.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <select
        className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        value={status}
        onChange={(event) => setStatus(event.target.value as TicketStatusValue)}
      >
        {TICKET_STATUS_VALUES.map((statusOption) => (
          <option key={statusOption} value={statusOption}>
            {formatTicketStatus(statusOption)}
          </option>
        ))}
      </select>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Saving..." : "Update status"}
      </Button>
    </form>
  );
}
