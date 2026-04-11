"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

type ReopenButtonProps = {
  ticketId: string;
};

export function ReopenButton({ ticketId }: ReopenButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleReopen() {
    startTransition(async () => {
      const res = await fetch(`/api/tickets/${ticketId}/reopen`, {
        method: "POST",
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        toast.error(payload?.error?.message ?? "Unable to reopen ticket.");
        return;
      }

      toast.success("Ticket reopened.");
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        <RotateCcw className="size-3.5 mr-1.5" />
        {isPending ? "Reopening..." : "Reopen ticket"}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Reopen this ticket?"
        description="This will set the ticket back to Open and notify the assigned operator. Use this if the issue was not fully resolved."
        confirmLabel="Reopen"
        onConfirm={handleReopen}
        loading={isPending}
      />
    </>
  );
}
