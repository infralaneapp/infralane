import { CreateTicketForm } from "@/components/tickets/create-ticket-form";
import { listTicketTypes } from "@/modules/tickets/service";

export default async function NewTicketPage() {
  const ticketTypes = await listTicketTypes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Create ticket</h1>
        <p className="page-subtitle">Capture the request in a structured form so the DevOps queue can triage and execute it consistently.</p>
      </div>

      <CreateTicketForm ticketTypes={ticketTypes} />
    </div>
  );
}
