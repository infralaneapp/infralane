import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";

import { AssignTicketForm } from "@/components/tickets/assign-ticket-form";
import { CommentForm } from "@/components/tickets/comment-form";
import { StatusBadge } from "@/components/tickets/status-badge";
import { StatusForm } from "@/components/tickets/status-form";
import { getSessionUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/formatters";
import { getTicketById, listAssignableUsers } from "@/modules/tickets/service";

type TicketDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { id } = await params;
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    notFound();
  }

  const [ticket, assignees] = await Promise.all([
    getTicketById(id, sessionUser),
    listAssignableUsers(sessionUser),
  ]);

  if (!ticket) {
    notFound();
  }

  const isDevops = sessionUser.role === UserRole.DEVOPS;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <section className="surface p-6">
          <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-medium text-accent">{ticket.reference}</div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{ticket.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                {ticket.description ?? "No description was provided for this ticket."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={ticket.status} />
              <div className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {ticket.ticketType.name}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Requester</p>
              <p className="mt-2 text-sm font-medium text-ink">{ticket.requester.name}</p>
              <p className="text-sm text-muted">{ticket.requester.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Assignee</p>
              <p className="mt-2 text-sm font-medium text-ink">{ticket.assignee?.name ?? "Unassigned"}</p>
              <p className="text-sm text-muted">{ticket.assignee?.email ?? "Awaiting triage"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Created</p>
              <p className="mt-2 text-sm text-ink">{formatDateTime(ticket.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Last updated</p>
              <p className="mt-2 text-sm text-ink">{formatDateTime(ticket.updatedAt)}</p>
            </div>
          </div>
        </section>

        <section className="surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Structured fields</h2>
              <p className="mt-1 text-sm text-muted">Values captured from the ticket type schema.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {ticket.structuredFields.map((field) => (
              <div key={field.key} className="rounded-lg border border-line bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{field.label}</p>
                <p className="mt-2 text-sm leading-6 text-ink">{field.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface p-6">
          <div>
            <h2 className="text-lg font-semibold text-ink">Comments</h2>
            <p className="mt-1 text-sm text-muted">Requester and DevOps discussion stays attached to the ticket.</p>
          </div>

          <div className="mt-6 space-y-4">
            {ticket.comments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line bg-slate-50 px-4 py-5 text-sm text-muted">
                No comments yet.
              </div>
            ) : (
              ticket.comments.map((comment) => (
                <article key={comment.id} className="rounded-lg border border-line bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm font-medium text-ink">{comment.author.name}</p>
                    <p className="text-xs text-muted">{formatDateTime(comment.createdAt)}</p>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.content}</p>
                </article>
              ))
            )}
          </div>

          <CommentForm ticketId={ticket.id} />
        </section>
      </div>

      <div className="space-y-6">
        {isDevops ? (
          <>
            <section className="surface p-6">
              <h2 className="text-lg font-semibold text-ink">Assignment</h2>
              <p className="mt-1 text-sm text-muted">Choose the DevOps engineer owning this request.</p>
              <div className="mt-5">
                <AssignTicketForm
                  assignees={assignees}
                  currentAssigneeId={ticket.assignee?.id ?? null}
                  ticketId={ticket.id}
                />
              </div>
            </section>

            <section className="surface p-6">
              <h2 className="text-lg font-semibold text-ink">Status</h2>
              <p className="mt-1 text-sm text-muted">Reflect queue progress and requester dependency.</p>
              <div className="mt-5">
                <StatusForm currentStatus={ticket.status} ticketId={ticket.id} />
              </div>
            </section>
          </>
        ) : null}

        <section className="surface p-6">
          <h2 className="text-lg font-semibold text-ink">Activity log</h2>
          <p className="mt-1 text-sm text-muted">Every state change is captured for auditability.</p>

          <div className="mt-5 space-y-4">
            {ticket.activities.map((activity) => (
              <div key={activity.id} className="border-l border-line pl-4">
                <p className="text-sm font-medium text-ink">{activity.message}</p>
                <p className="mt-1 text-xs text-muted">
                  {activity.actor?.name ?? "System"} • {formatDateTime(activity.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
