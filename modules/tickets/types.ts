import type { UserRole } from "@prisma/client";

export type TicketTypeKey = "access" | "deployment" | "incident" | "infra";

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
};

export type TicketSummary = {
  id: string;
  reference: string;
  title: string;
  status: TicketStatusValue;
  createdAt: string;
  updatedAt: string;
  requester: UserOption;
  assignee: UserOption | null;
  type: Pick<TicketTypeView, "id" | "key" | "name">;
};

export type TicketDetail = TicketSummary & {
  description: string | null;
  ticketType: TicketTypeView;
  structuredFields: TicketFieldValueView[];
  comments: TicketCommentView[];
  activities: TicketActivityView[];
};
