import type { TicketFieldDefinition, TicketPriorityValue, TicketStatusValue, TicketTypeKey } from "@/modules/tickets/types";

export const TICKET_TYPE_KEYS = ["access", "deployment", "incident", "infra"] as const;

export const TICKET_PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const TICKET_PRIORITY_LABELS: Record<TicketPriorityValue, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

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
      {
        key: "duration",
        label: "Access duration",
        required: true,
        type: "select",
        options: ["24 hours", "7 days", "30 days", "permanent"],
      },
      {
        key: "approval",
        label: "Manager approval",
        type: "select",
        options: ["obtained", "pending", "not required"],
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
      {
        key: "image_ref",
        label: "Image tag or commit SHA",
        required: true,
        placeholder: "sha-abc1234 or v2.14.0-rc1",
      },
      {
        key: "deploy_window",
        label: "Deploy window",
        required: true,
        type: "select",
        options: ["business hours", "low-traffic", "maintenance window", "immediate"],
      },
      {
        key: "rollback_plan",
        label: "Rollback plan",
        required: true,
        type: "textarea",
        placeholder: "Steps to revert if deployment fails.",
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
      {
        key: "start_time",
        label: "When did this start?",
        placeholder: "e.g. 2026-04-10 14:30 UTC",
      },
      {
        key: "symptoms",
        label: "Observable symptoms",
        required: true,
        type: "textarea",
        placeholder: "What is the user-visible impact?",
      },
      {
        key: "business_impact",
        label: "Business impact",
        required: true,
        type: "textarea",
        placeholder: "Revenue, users, or SLA exposure.",
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
      {
        key: "urgency",
        label: "Urgency",
        required: true,
        type: "select",
        options: ["immediate", "next 4h", "next business day", "flexible"],
      },
      {
        key: "expected_completion",
        label: "Expected completion",
        placeholder: "e.g. end of sprint, 48h",
      },
    ],
  },
];
