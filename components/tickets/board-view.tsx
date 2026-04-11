"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { StatusBadge } from "@/components/tickets/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelativeTime, formatTicketStatus } from "@/lib/formatters";
import {
  TICKET_STATUS_VALUES,
  TICKET_STATUS_LABELS,
} from "@/modules/tickets/constants";
import type {
  TicketStatusValue,
  TicketPriorityValue,
  UserOption,
} from "@/modules/tickets/types";

type BoardTicket = {
  id: string;
  reference: string;
  title: string;
  status: TicketStatusValue;
  priority: TicketPriorityValue;
  createdAt: string;
  updatedAt: string;
  requester: UserOption;
  assignee: UserOption | null;
  type: { id: string; key: string; name: string };
};

const COLUMN_ORDER: TicketStatusValue[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
];

export function BoardView({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [tickets, setTickets] = useState<BoardTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TicketStatusValue | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/tickets");
      if (!res.ok) return;
      const json = await res.json();
      setTickets(json.data?.tickets ?? []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  function getColumnTickets(status: TicketStatusValue) {
    return tickets.filter((t) => t.status === status);
  }

  function handleDragStart(e: React.DragEvent, ticketId: string) {
    setDraggingId(ticketId);
    e.dataTransfer.setData("text/plain", ticketId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropTarget(null);
  }

  function handleDragOver(e: React.DragEvent, status: TicketStatusValue) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(status);
  }

  function handleDragLeave(e: React.DragEvent, status: TicketStatusValue) {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      if (dropTarget === status) setDropTarget(null);
    }
  }

  async function handleDrop(e: React.DragEvent, newStatus: TicketStatusValue) {
    e.preventDefault();
    setDropTarget(null);

    const ticketId = e.dataTransfer.getData("text/plain");
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;

    const oldStatus = ticket.status;

    // Optimistic update
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      // Auto-assign to the person who moved it to IN_PROGRESS
      if (newStatus === "IN_PROGRESS") {
        await fetch(`/api/tickets/${ticketId}/assign`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assigneeId: currentUserId }),
        });
      }

      toast.success(
        `${ticket.reference} moved to ${formatTicketStatus(newStatus)}`
      );
    } catch {
      // Revert on failure
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, status: oldStatus } : t
        )
      );
      toast.error("Failed to update ticket status.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-heading text-foreground">
          Board
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag tickets between columns to update their status.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMN_ORDER.map((status) => {
          const columnTickets = getColumnTickets(status);
          const isOver = dropTarget === status;

          return (
            <div
              key={status}
              className="flex w-72 shrink-0 flex-col"
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={(e) => handleDragLeave(e, status)}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column header */}
              <div className="mb-3 flex items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-xs font-medium text-muted-foreground">
                  {columnTickets.length}
                </span>
              </div>

              {/* Drop zone */}
              <div
                className={`flex flex-1 flex-col gap-2 rounded-xl border-2 border-dashed p-2 transition-colors ${
                  isOver
                    ? "border-primary/40 bg-primary/5"
                    : "border-transparent bg-muted/30"
                }`}
                style={{ minHeight: "12rem" }}
              >
                {columnTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    size="sm"
                    draggable
                    onDragStart={(e) => handleDragStart(e, ticket.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                    className={`cursor-pointer transition-shadow hover:shadow-md ${
                      draggingId === ticket.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-2 px-3 py-2.5">
                      {/* Header: ref + grip */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">
                          {ticket.reference}
                        </span>
                        <GripVertical className="size-3.5 text-muted-foreground/50" />
                      </div>

                      {/* Title */}
                      <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                        {ticket.title}
                      </p>

                      {/* Footer: priority + assignee + time */}
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={ticket.priority} />
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          {formatRelativeTime(ticket.updatedAt)}
                        </span>
                        {ticket.assignee && (
                          <UserAvatar
                            name={ticket.assignee.name}
                            size="sm"
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

                {columnTickets.length === 0 && !isOver && (
                  <div className="flex flex-1 items-center justify-center py-8">
                    <span className="text-xs text-muted-foreground/60">
                      No tickets
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
