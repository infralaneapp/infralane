import type { TicketFieldDefinition, TicketStatusValue, TicketTypeKey } from "@/modules/tickets/types";

export const TICKET_TYPE_KEYS = ["access", "deployment", "incident", "infra"] as const;

export const TICKET_STATUS_VALUES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
] as const;

export const TICKET_STATUS_LABELS: Record<TicketStatusValue, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_FOR_REQUESTER: "Waiting for requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const DEFAULT_TICKET_TYPES: Array<{
  key: TicketTypeKey;
  name: string;
  description: string;
  fieldSchema: TicketFieldDefinition[];
}> = [
  {
    key: "access",
    name: "Access request",
    description: "Request access to an internal system or environment.",
    fieldSchema: [
      {
        key: "system",
        label: "System",
        required: true,
        placeholder: "GitHub, AWS, Datadog",
      },
      {
        key: "environment",
        label: "Environment",
        required: true,
        type: "select",
        options: ["dev", "staging", "production"],
      },
      {
        key: "access_type",
        label: "Access type",
        required: true,
        type: "select",
        options: ["read", "write", "admin"],
      },
      {
        key: "justification",
        label: "Justification",
        required: true,
        type: "textarea",
        placeholder: "Why is this access required?",
      },
    ],
  },
  {
    key: "deployment",
    name: "Deployment",
    description: "Coordinate a release, rollback, or change deployment.",
    fieldSchema: [
      {
        key: "service_name",
        label: "Service name",
        required: true,
        placeholder: "billing-api",
      },
      {
        key: "environment",
        label: "Environment",
        required: true,
        type: "select",
        options: ["staging", "production"],
      },
      {
        key: "version",
        label: "Version",
        required: true,
        placeholder: "v2.14.0",
      },
    ],
  },
  {
    key: "incident",
    name: "Incident",
    description: "Track operational work for an outage or degraded service.",
    fieldSchema: [
      {
        key: "severity",
        label: "Severity",
        required: true,
        type: "select",
        options: ["sev1", "sev2", "sev3", "sev4"],
      },
      {
        key: "affected_service",
        label: "Affected service",
        required: true,
        placeholder: "payments-worker",
      },
      {
        key: "environment",
        label: "Environment",
        type: "select",
        options: ["staging", "production"],
      },
    ],
  },
  {
    key: "infra",
    name: "Infrastructure",
    description: "Ask for infrastructure provisioning or configuration changes.",
    fieldSchema: [
      {
        key: "resource_type",
        label: "Resource type",
        required: true,
        placeholder: "RDS instance, S3 bucket, Redis cluster",
      },
      {
        key: "environment",
        label: "Environment",
        type: "select",
        options: ["dev", "staging", "production"],
      },
      {
        key: "requested_change",
        label: "Requested change",
        required: true,
        type: "textarea",
        placeholder: "Describe the infrastructure work required.",
      },
    ],
  },
];
