import Link from "next/link";

import { formatDateTime } from "@/lib/formatters";
import type { TicketSummary } from "@/modules/tickets/types";
import { StatusBadge } from "@/components/tickets/status-badge";

type TicketTableProps = {
  tickets: TicketSummary[];
};

export function TicketTable({ tickets }: TicketTableProps) {
  if (tickets.length === 0) {
    return (
      <div className="surface p-10 text-center">
        <h2 className="text-lg font-semibold text-ink">No tickets found</h2>
        <p className="mt-2 text-sm text-muted">Adjust the filters or create a new ticket to start the queue.</p>
      </div>
    );
  }

  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              <th className="px-5 py-3">Ticket</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Assignee</th>
              <th className="px-5 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-slate-50/80">
                <td className="px-5 py-4 align-top">
                  <Link href={`/tickets/${ticket.id}`} className="block">
                    <div className="text-sm font-medium text-ink">{ticket.title}</div>
                    <div className="mt-1 text-xs text-muted">{ticket.reference}</div>
                  </Link>
                </td>
                <td className="px-5 py-4 align-top text-sm text-slate-700">{ticket.type.name}</td>
                <td className="px-5 py-4 align-top">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-5 py-4 align-top text-sm text-slate-700">
                  {ticket.assignee ? ticket.assignee.name : "Unassigned"}
                </td>
                <td className="px-5 py-4 align-top text-sm text-muted">{formatDateTime(ticket.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
