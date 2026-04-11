import { notFound } from "next/navigation";
import { Clock, MessageSquare, User } from "lucide-react";

import { AssignTicketForm } from "@/components/tickets/assign-ticket-form";
import { CommentForm } from "@/components/tickets/comment-form";
import { StatusBadge } from "@/components/tickets/status-badge";
import { StatusForm } from "@/components/tickets/status-form";
import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/auth/permissions";
import { formatDateTime, formatRelativeTime } from "@/lib/formatters";
import { getTicketById, listAllUsers, listAssignableUsers } from "@/modules/tickets/service";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { ActivityLog } from "@/components/tickets/activity-log";
import { AutomationPanel } from "@/components/tickets/automation-panel";
import { SlaIndicator } from "@/components/tickets/sla-indicator";
import { CommentContent } from "@/components/tickets/comment-content";
import { FileUpload } from "@/components/tickets/file-upload";
import { TagPicker } from "@/components/tickets/tag-picker";
import { RelatedTickets } from "@/components/tickets/related-tickets";
import { InlineEdit } from "@/components/tickets/inline-edit";
import { NextAction } from "@/components/tickets/next-action";
import { ReopenButton } from "@/components/tickets/reopen-button";
import { TicketRating } from "@/components/tickets/ticket-rating";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type TicketDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { id } = await params;
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    notFound();
  }

  const [ticket, assignees, allUsers, pendingApprovalCount] = await Promise.all([
    getTicketById(id, sessionUser),
    listAssignableUsers(sessionUser),
    listAllUsers(),
    prisma.approvalRequest.count({ where: { ticketId: id, status: "PENDING" } }),
  ]);

  if (!ticket) {
    notFound();
  }

  const isAdmin = isStaffRole(sessionUser.role);

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/tickets">Tickets</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{ticket.reference}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main content */}
        <div className="space-y-6">
          {/* Header card */}
          <Card className="p-6 shadow-card">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-primary">{ticket.reference}</span>
                  <Badge variant="outline" className="text-xs font-medium">
                    {ticket.ticketType.name}
                  </Badge>
                  <PriorityBadge priority={ticket.priority} />
                  <NextAction status={ticket.status} assigneeId={ticket.assignee?.id ?? null} isAdmin={isAdmin} />
                </div>
                {isAdmin ? (
                  <>
                    <div className="mt-2">
                      <InlineEdit ticketId={ticket.id} field="title" value={ticket.title} />
                    </div>
                    <div className="mt-2">
                      <InlineEdit ticketId={ticket.id} field="description" value={ticket.description ?? ""} multiline />
                    </div>
                  </>
                ) : (
                  <>
                    <h1 className="mt-2 text-xl font-semibold tracking-heading text-foreground">
                      {ticket.title}
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                      {ticket.description ?? "No description provided."}
                    </p>
                  </>
                )}
                {ticket.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {ticket.tags.map((tt) => (
                      <span key={tt.id} className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: tt.tag.color }}>
                        {tt.tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={ticket.status} />
                {!isAdmin && (ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (
                  <ReopenButton ticketId={ticket.id} />
                )}
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-badge text-muted-foreground">Requester</p>
                <p className="mt-1.5 text-sm font-medium text-foreground">{ticket.requester.name}</p>
                <p className="text-[13px] text-muted-foreground">{ticket.requester.email}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-badge text-muted-foreground">Assignee</p>
                <p className="mt-1.5 text-sm font-medium text-foreground">
                  {ticket.assignee?.name ?? "Unassigned"}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {ticket.assignee?.email ?? "Awaiting triage"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-badge text-muted-foreground">Created</p>
                <p className="mt-1.5 text-sm text-foreground">{formatDateTime(ticket.createdAt)}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-badge text-muted-foreground">Last updated</p>
                <p className="mt-1.5 text-sm text-foreground">{formatDateTime(ticket.updatedAt)}</p>
              </div>
            </div>
          </Card>

          {/* Structured fields */}
          <Card className="p-6 shadow-card">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Structured fields</h2>
            <p className="mt-1 text-sm text-muted-foreground">Values captured from the ticket type schema.</p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {ticket.structuredFields.map((field) => (
                <div key={field.key} className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-badge text-muted-foreground">
                    {field.label}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">{field.value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Comments */}
          <Card className="p-6 shadow-card">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              <h2 className="text-base font-semibold tracking-tight text-foreground">Comments</h2>
              <span className="text-sm text-muted-foreground">({ticket.comments.length})</span>
            </div>

            <div className="mt-5 space-y-3">
              {ticket.comments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
                  No comments yet. Start the conversation below.
                </div>
              ) : (
                ticket.comments.map((comment) => (
                  <article key={comment.id} className="rounded-lg border border-border bg-muted/30 px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={comment.author.name} size="sm" />
                        <span className="text-sm font-medium text-foreground">{comment.author.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground" title={comment.createdAt}>
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <CommentContent content={comment.content} />
                  </article>
                ))
              )}
            </div>

            <CommentForm ticketId={ticket.id} users={allUsers} isStaff={isAdmin} />
          </Card>

          {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && sessionUser.id === ticket.requester.id && (
            <TicketRating ticketId={ticket.id} isRequester={true} status={ticket.status} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {isAdmin ? (
            <>
              <Card className="p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Assignment</h2>
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Choose the DevOps engineer owning this ticket.
                </p>
                <div className="mt-4">
                  <AssignTicketForm
                    assignees={assignees}
                    currentAssigneeId={ticket.assignee?.id ?? null}
                    ticketId={ticket.id}
                  />
                </div>
              </Card>

              <Card className="p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Status</h2>
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Reflect queue progress and requester dependency.
                </p>
                <div className="mt-4">
                  <StatusForm currentStatus={ticket.status} ticketId={ticket.id} hasPendingApproval={pendingApprovalCount > 0} />
                </div>
              </Card>
            </>
          ) : null}

          <TagPicker ticketId={ticket.id} currentTags={ticket.tags} />

          <FileUpload ticketId={ticket.id} />

          <RelatedTickets ticketId={ticket.id} />

          <Card className="p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">SLA</h2>
            </div>
            <div className="mt-3">
              <SlaIndicator
                createdAt={ticket.createdAt}
                firstResponseAt={ticket.firstResponseAt}
                resolvedAt={ticket.resolvedAt}
                priority={ticket.priority}
                status={ticket.status}
              />
            </div>
          </Card>

          <ActivityLog activities={ticket.activities} />

          {isAdmin && <AutomationPanel ticketId={ticket.id} />}
        </div>
      </div>
    </div>
  );
}
