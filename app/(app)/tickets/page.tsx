import Link from "next/link";
import { Plus } from "lucide-react";

import { TicketFilters } from "@/components/tickets/ticket-filters";
import { TicketTable } from "@/components/tickets/ticket-table";
import { Pagination } from "@/components/pagination";
import { SavedFilters } from "@/components/tickets/saved-filters";
import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/auth/permissions";
import { listAssignableUsers, listTickets, listTicketTypes } from "@/modules/tickets/service";
import { listTicketsFilterSchema } from "@/modules/tickets/schemas";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getQueueSummary } from "@/modules/tickets/stats";
import { cn } from "@/lib/utils";
import { ImportDialog } from "@/components/tickets/import-dialog";
import { Onboarding } from "@/components/onboarding";

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
    view: getSingleValue(params.view),
    q: getSingleValue(params.q),
    page: getSingleValue(params.page),
  });

  const filters = filterResult.success ? filterResult.data : { page: 1, pageSize: 20 };

  const isAdmin = sessionUser.role === "ADMIN";
  const isStaff = isStaffRole(sessionUser.role);

  const [result, ticketTypes, assignees, summary] = await Promise.all([
    listTickets(filters, sessionUser),
    listTicketTypes(),
    listAssignableUsers(sessionUser),
    getQueueSummary(sessionUser),
  ]);

  const currentView = filters.view ?? "all";

  return (
    <div className="space-y-6">
      {!sessionUser.onboarded && <Onboarding user={sessionUser} />}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-heading text-foreground">
            {isStaff ? "Ticket queue" : "My tickets"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isStaff
              ? "Shared operational work across access, deployment, incident, and infrastructure requests."
              : "Track the operational requests you have submitted to the DevOps team."}
          </p>
        </div>

        <div className="flex gap-2">
          {isAdmin && <ImportDialog />}
          <Link href="/tickets/new" className={buttonVariants()}>
            <Plus className="size-4" data-icon="inline-start" />
            Create ticket
          </Link>
        </div>
      </div>

      {/* Queue summary */}
      <Card className="px-4 py-3 shadow-card">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {isStaff ? (
            <>
              <SummaryStat label="Open" value={summary.open} />
              <SummaryStat label="Mine" value={summary.mine} />
              <SummaryStat label="Stale" value={summary.stale} />
              <SummaryStat label="Awaiting response" value={summary.awaitingResponse} />
            </>
          ) : (
            <>
              <SummaryStat label="Open" value={summary.open} />
              <SummaryStat label="Awaiting your response" value={summary.awaitingResponse} />
              <SummaryStat label="Recently resolved" value={summary.recentlyResolved} />
            </>
          )}
        </div>
      </Card>

      {/* Mine/All toggle (DevOps only) */}
      {isStaff && (
        <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
          <Link
            href="/tickets?view=all"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              currentView === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All queue
          </Link>
          <Link
            href="/tickets?view=mine"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              currentView === "mine"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Assigned to me
          </Link>
        </div>
      )}

      <SavedFilters />
      <TicketFilters
        assignees={assignees}
        filters={filters}
        showAssigneeFilter={isStaff}
        ticketTypes={ticketTypes}
      />
      <TicketTable tickets={result.tickets} isAdmin={isStaff} assignees={assignees} />
      <Pagination
        currentPage={result.page}
        totalPages={result.totalPages}
        total={result.total}
        basePath="/tickets"
        searchParams={{
          status: filters.status,
          type: filters.type,
          assigneeId: filters.assigneeId,
          view: filters.view,
          q: filters.q,
        }}
      />
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-base font-bold text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
