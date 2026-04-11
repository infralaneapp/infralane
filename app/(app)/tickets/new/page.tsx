import { CreateTicketForm } from "@/components/tickets/create-ticket-form";
import { listTicketTypes } from "@/modules/tickets/service";
import { prisma } from "@/lib/db";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default async function NewTicketPage() {
  const [ticketTypes, templates] = await Promise.all([
    listTicketTypes(),
    prisma.ticketTemplate.findMany({
      include: { ticketType: { select: { key: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/tickets">Tickets</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New ticket</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-semibold tracking-heading text-foreground">Create ticket</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capture the request in a structured form so the DevOps queue can triage and execute it consistently.
        </p>
      </div>

      <CreateTicketForm ticketTypes={ticketTypes} templates={templates} />
    </div>
  );
}
