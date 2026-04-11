import Link from "next/link";
import { Filter, RotateCcw } from "lucide-react";

import { TICKET_STATUS_VALUES } from "@/modules/tickets/constants";
import { formatTicketStatus } from "@/lib/formatters";
import type { TicketStatusValue, TicketTypeView, UserOption } from "@/modules/tickets/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

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
    <Card className="shadow-card">
      <form className="flex flex-col flex-wrap gap-4 p-4 lg:flex-row lg:items-end" method="get">
        <div className="w-full sm:min-w-[180px] sm:w-auto flex-1">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            className="mt-1.5 flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            defaultValue={filters.status ?? ""}
          >
            <option value="">All statuses</option>
            {TICKET_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {formatTicketStatus(status)}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:min-w-[180px] sm:w-auto flex-1">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            className="mt-1.5 flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            defaultValue={filters.type ?? ""}
          >
            <option value="">All types</option>
            {ticketTypes.map((ticketType) => (
              <option key={ticketType.id} value={ticketType.key}>
                {ticketType.name}
              </option>
            ))}
          </select>
        </div>

        {showAssigneeFilter ? (
          <div className="w-full sm:min-w-[220px] sm:w-auto flex-1">
            <Label htmlFor="assigneeId">Assignee</Label>
            <select
              id="assigneeId"
              name="assigneeId"
              className="mt-1.5 flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              defaultValue={filters.assigneeId ?? ""}
            >
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

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button type="submit" size="default">
            <Filter className="size-3.5" data-icon="inline-start" />
            Apply
          </Button>
          <Link href="/tickets" className={buttonVariants({ variant: "outline" })}>
            <RotateCcw className="size-3.5" data-icon="inline-start" />
            Reset
          </Link>
        </div>
      </form>
    </Card>
  );
}
