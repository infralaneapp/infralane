import Link from "next/link";
import { UserRole } from "@prisma/client";

import { TicketFilters } from "@/components/tickets/ticket-filters";
import { TicketTable } from "@/components/tickets/ticket-table";
import { getSessionUser } from "@/lib/auth";
import { listAssignableUsers, listTickets, listTicketTypes } from "@/modules/tickets/service";
import { listTicketsFilterSchema } from "@/modules/tickets/schemas";

type TicketsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const sessionUser = await getSessionUser();
  const params = await searchParams;

  if (!sessionUser) {
    return null;
  }

  const filterResult = listTicketsFilterSchema.safeParse({
    status: getSingleValue(params.status),
    type: getSingleValue(params.type),
    assigneeId: getSingleValue(params.assigneeId),
  });

  const filters = filterResult.success ? filterResult.data : {};

  const [tickets, ticketTypes, assignees] = await Promise.all([
    listTickets(filters, sessionUser),
    listTicketTypes(),
    listAssignableUsers(sessionUser),
  ]);

  const isDevops = sessionUser.role === UserRole.DEVOPS;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">{isDevops ? "Ticket queue" : "My tickets"}</h1>
          <p className="page-subtitle">
            {isDevops
              ? "Shared operational work across access, deployment, incident, and infrastructure requests."
              : "Track the operational requests you have submitted to the DevOps team."}
          </p>
        </div>

        <Link href="/tickets/new" className="button-primary">
          Create ticket
        </Link>
      </div>

      <TicketFilters
        assignees={assignees}
        filters={filters}
        showAssigneeFilter={isDevops}
        ticketTypes={ticketTypes}
      />
      <TicketTable tickets={tickets} />
    </div>
  );
}
