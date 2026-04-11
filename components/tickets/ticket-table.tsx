"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Inbox, Plus, Users, XCircle, Download } from "lucide-react";
import { toast } from "sonner";

import { formatRelativeTime, formatAge, isStale } from "@/lib/formatters";
import type { TicketSummary, TicketStatusValue, UserOption } from "@/modules/tickets/types";
import { StatusBadge } from "@/components/tickets/status-badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TicketTableProps = {
  tickets: TicketSummary[];
  isAdmin?: boolean;
  assignees?: UserOption[];
};

function getNextAction(ticket: TicketSummary): { label: string; className: string } {
  switch (ticket.status) {
    case "OPEN":
      if (!ticket.assignee) {
        return { label: "Needs triage", className: "text-amber-600 dark:text-amber-400" };
      }
      return { label: "Pending start", className: "text-muted-foreground" };
    case "IN_PROGRESS":
      return { label: "In progress", className: "text-blue-600 dark:text-blue-400" };
    case "WAITING_FOR_REQUESTER":
      return { label: "Awaiting response", className: "text-violet-600 dark:text-violet-400" };
    case "RESOLVED":
      return { label: "Ready to close", className: "text-green-600 dark:text-green-400" };
    case "CLOSED":
      return { label: "Closed", className: "text-muted-foreground/60" };
    default:
      return { label: "", className: "" };
  }
}

function getAgeClassName(ticket: TicketSummary): string {
  const activeStatuses: TicketStatusValue[] = ["OPEN", "IN_PROGRESS"];
  if (!activeStatuses.includes(ticket.status)) return "text-muted-foreground";

  const veryStale = isStale(ticket.createdAt, 48);
  if (veryStale) return "text-red-600 dark:text-red-400 font-medium";

  const staleish = isStale(ticket.createdAt, 24);
  if (staleish) return "text-amber-600 dark:text-amber-400 font-medium";

  return "text-muted-foreground";
}

export function TicketTable({ tickets, isAdmin = false, assignees = [] }: TicketTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === tickets.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tickets.map((t) => t.id)));
    }
  }

  async function bulkAction(action: "assign" | "close", assigneeId?: string) {
    setBulkPending(true);
    try {
      const res = await fetch("/api/tickets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketIds: Array.from(selected), action, assigneeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error?.message ?? "Bulk action failed.");
        return;
      }
      toast.success(`${data.data.updated} ticket(s) updated.`);
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkPending(false);
    }
  }

  if (tickets.length === 0) {
    return (
      <Card className="flex flex-col items-center p-12 text-center shadow-card">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Inbox className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-foreground">Queue empty</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          No requests match the current filters.
        </p>
        <Link href="/tickets/new" className={`mt-5 ${buttonVariants()}`}>
          <Plus className="size-4" data-icon="inline-start" />
          New request
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {isAdmin && selected.size > 0 && (
        <Card className="flex items-center gap-3 px-4 py-2.5 shadow-card">
          <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            {assignees.length > 0 && (
              <select
                className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                defaultValue=""
                disabled={bulkPending}
                onChange={(e) => {
                  if (e.target.value) bulkAction("assign", e.target.value);
                }}
              >
                <option value="" disabled>Bulk assign...</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
            <Button variant="destructive" size="sm" disabled={bulkPending} onClick={() => bulkAction("close")}>
              <XCircle className="size-3.5 mr-1" />
              Close
            </Button>
            <a
              href={`/api/tickets/export?${new URLSearchParams(window.location.search)}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
              download
            >
              <Download className="size-3.5" />
              Export CSV
            </a>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {isAdmin && (
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border-input accent-primary"
                    checked={selected.size === tickets.length && tickets.length > 0}
                    onChange={toggleAll}
                  />
                </TableHead>
              )}
              <TableHead className="text-[12px] font-medium uppercase tracking-label text-muted-foreground">
                Request
              </TableHead>
              <TableHead className="text-[12px] font-medium uppercase tracking-label text-muted-foreground">
                Type
              </TableHead>
              <TableHead className="text-[12px] font-medium uppercase tracking-label text-muted-foreground">
                Priority
              </TableHead>
              <TableHead className="text-[12px] font-medium uppercase tracking-label text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-[12px] font-medium uppercase tracking-label text-muted-foreground">
                Assignee
              </TableHead>
              <TableHead className="hidden sm:table-cell text-[12px] font-medium uppercase tracking-label text-muted-foreground">
                Updated
              </TableHead>
              <TableHead className="hidden sm:table-cell text-[12px] font-medium uppercase tracking-label text-muted-foreground">
                Age
              </TableHead>
              {isAdmin && (
                <TableHead className="hidden sm:table-cell text-[12px] font-medium uppercase tracking-label text-muted-foreground">
                  Next action
                </TableHead>
              )}
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => {
              const nextAction = isAdmin ? getNextAction(ticket) : null;
              const ageClass = getAgeClassName(ticket);

              return (
                <TableRow key={ticket.id} className={cn("group", selected.has(ticket.id) && "bg-accent/30")}>
                  {isAdmin && (
                    <TableCell className="py-3.5">
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border-input accent-primary"
                        checked={selected.has(ticket.id)}
                        onChange={() => toggleSelect(ticket.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="py-3.5">
                    <Link href={`/tickets/${ticket.id}`} className="block">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {ticket.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{ticket.reference}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <span className="text-sm text-muted-foreground">{ticket.type.name}</span>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <PriorityBadge priority={ticket.priority} />
                  </TableCell>
                  <TableCell className="py-3.5">
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="py-3.5">
                    {ticket.assignee ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar name={ticket.assignee.name} size="sm" />
                        <span className="text-sm text-muted-foreground">{ticket.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/60">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell py-3.5">
                    <span className="text-[13px] text-muted-foreground" title={ticket.updatedAt}>
                      {formatRelativeTime(ticket.updatedAt)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell py-3.5">
                    <span className={cn("text-[13px]", ageClass)} title={ticket.createdAt}>
                      {formatAge(ticket.createdAt)}
                    </span>
                  </TableCell>
                  {isAdmin && nextAction && (
                    <TableCell className="hidden sm:table-cell py-3.5">
                      <span className={cn("text-sm font-medium", nextAction.className)}>
                        {nextAction.label}
                      </span>
                    </TableCell>
                  )}
                  <TableCell className="py-3.5">
                    <ChevronRight className="size-4 text-muted-foreground/40 transition-colors group-hover:text-primary" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
