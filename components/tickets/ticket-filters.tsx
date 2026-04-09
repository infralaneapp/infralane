import Link from "next/link";

import { TICKET_STATUS_VALUES } from "@/modules/tickets/constants";
import { formatTicketStatus } from "@/lib/formatters";
import type { TicketStatusValue, TicketTypeView, UserOption } from "@/modules/tickets/types";

type TicketFiltersProps = {
  filters: {
    status?: TicketStatusValue;
    type?: string;
    assigneeId?: string;
  };
  ticketTypes: TicketTypeView[];
  assignees: UserOption[];
  showAssigneeFilter?: boolean;
};

export function TicketFilters({ filters, ticketTypes, assignees, showAssigneeFilter = true }: TicketFiltersProps) {
  return (
    <form className="surface flex flex-col gap-4 p-4 lg:flex-row lg:items-end" method="get">
      <div className="min-w-[180px] flex-1">
        <label className="label" htmlFor="status">
          Status
        </label>
        <select id="status" name="status" className="input-control" defaultValue={filters.status ?? ""}>
          <option value="">All statuses</option>
          {TICKET_STATUS_VALUES.map((status) => (
            <option key={status} value={status}>
              {formatTicketStatus(status)}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[180px] flex-1">
        <label className="label" htmlFor="type">
          Type
        </label>
        <select id="type" name="type" className="input-control" defaultValue={filters.type ?? ""}>
          <option value="">All types</option>
          {ticketTypes.map((ticketType) => (
            <option key={ticketType.id} value={ticketType.key}>
              {ticketType.name}
            </option>
          ))}
        </select>
      </div>

      {showAssigneeFilter ? (
        <div className="min-w-[220px] flex-1">
          <label className="label" htmlFor="assigneeId">
            Assignee
          </label>
          <select id="assigneeId" name="assigneeId" className="input-control" defaultValue={filters.assigneeId ?? ""}>
            <option value="">All engineers</option>
            <option value="unassigned">Unassigned</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex gap-3">
        <button type="submit" className="button-primary">
          Apply filters
        </button>
        <Link href="/tickets" className="button-secondary">
          Reset
        </Link>
      </div>
    </form>
  );
}
