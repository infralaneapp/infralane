import type { UserRole } from "@prisma/client";

export type TicketTypeKey = "access" | "deployment" | "incident" | "infra";

export type TicketPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketStatusValue =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED";

export type TicketFieldDefinition = {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
  description?: string;
};

export type TicketFieldInput = {
  key: string;
  value: string;
};

export type UserOption = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type TicketTypeView = {
  id: string;
  key: TicketTypeKey;
  name: string;
  description: string | null;
  fieldSchema: TicketFieldDefinition[];
};

export type TicketFieldValueView = {
  key: string;
  label: string;
  value: string;
};

export type TicketCommentView = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: UserOption;
};

export type TicketActivityView = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  actor: UserOption | null;
  metadata: Record<string, unknown> | null;
};

export type TicketSummary = {
  id: string;
  reference: string;
  title: string;
  status: TicketStatusValue;
  priority: TicketPriorityValue;
  createdAt: string;
  updatedAt: string;
  requester: UserOption;
  assignee: UserOption | null;
  type: Pick<TicketTypeView, "id" | "key" | "name">;
};

export type TicketTagView = {
  id: string;
  tag: { id: string; name: string; color: string };
};

export type TicketDetail = TicketSummary & {
  description: string | null;
  ticketType: TicketTypeView;
  structuredFields: TicketFieldValueView[];
  comments: TicketCommentView[];
  activities: TicketActivityView[];
  tags: TicketTagView[];
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
};
