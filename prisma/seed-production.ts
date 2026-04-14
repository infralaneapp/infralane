/**
 * Production seed — only creates ticket types, automation rules, and templates.
 * Does NOT create demo users or sample tickets.
 * The first user to register becomes ADMIN automatically.
 */
import { PrismaClient } from "@prisma/client";

import { DEFAULT_TICKET_TYPES } from "../modules/tickets/constants";

const prisma = new PrismaClient();

async function seedTicketTypes() {
  await Promise.all(
    DEFAULT_TICKET_TYPES.map((ticketType) =>
      prisma.ticketType.upsert({
        where: { key: ticketType.key },
        update: {
          name: ticketType.name,
          description: ticketType.description,
          fieldSchema: ticketType.fieldSchema,
        },
        create: {
          key: ticketType.key,
          name: ticketType.name,
          description: ticketType.description,
          fieldSchema: ticketType.fieldSchema,
        },
      }),
    ),
  );
  console.log(`  Seeded ${DEFAULT_TICKET_TYPES.length} ticket types`);
}

async function seedAutomationRules() {
  const rules = [
    {
      systemKey: "auto-assign-urgent-incidents",
      name: "Auto-assign urgent incidents",
      trigger: "TICKET_CREATED" as const,
      conditions: { ticketType: "incident", priority: "URGENT" },
      action: "ASSIGN_TO" as const,
      actionValue: "auto",
    },
    {
      systemKey: "stale-requester-reminder",
      name: "Stale requester reminder",
      trigger: "STALE_WAITING" as const,
      conditions: {},
      action: "NOTIFY" as const,
      actionValue: "requester",
    },
    {
      systemKey: "incident-escalation-sla",
      name: "Incident escalation on SLA breach",
      trigger: "SLA_BREACHED" as const,
      conditions: { ticketType: "incident", priority: "HIGH" },
      action: "CHANGE_PRIORITY" as const,
      actionValue: "URGENT",
    },
    {
      systemKey: "auto-tag-production",
      name: "Auto-tag production environment",
      trigger: "TICKET_CREATED" as const,
      conditions: { environment: "production" },
      action: "ADD_TAG" as const,
      actionValue: "production",
    },
    {
      systemKey: "auto-close-resolved",
      name: "Auto-close resolved tickets",
      trigger: "RESOLVED_EXPIRED" as const,
      conditions: {},
      action: "CHANGE_STATUS" as const,
      actionValue: "CLOSED",
    },
    {
      systemKey: "prod-access-approval",
      name: "Production access approval",
      trigger: "TICKET_CREATED" as const,
      conditions: { ticketType: "access", environment: "production" },
      action: "NOTIFY" as const,
      actionValue: "requester",
      requiresApproval: true,
    },
    {
      systemKey: "prod-deployment-approval",
      name: "Production deployment approval",
      trigger: "TICKET_CREATED" as const,
      conditions: { ticketType: "deployment", environment: "production" },
      action: "NOTIFY" as const,
      actionValue: "requester",
      requiresApproval: true,
    },
  ];

  for (const rule of rules) {
    await prisma.automationRule.upsert({
      where: { systemKey: rule.systemKey },
      update: { name: rule.name },
      create: {
        systemKey: rule.systemKey,
        name: rule.name,
        builtIn: true,
        enabled: true,
        trigger: rule.trigger,
        conditions: rule.conditions,
        action: rule.action,
        actionValue: rule.actionValue,
        requiresApproval: rule.requiresApproval ?? false,
      },
    });
  }

  console.log(`  Seeded ${rules.length} built-in automation rules`);
}

async function seedTemplates() {
  const ticketTypes = await prisma.ticketType.findMany({ select: { id: true, key: true } });
  const typeMap = Object.fromEntries(ticketTypes.map((t) => [t.key, t.id]));

  const templates = [
    {
      systemKey: "standard-access-request",
      name: "Standard access request",
      ticketTypeId: typeMap.access,
      priority: "MEDIUM" as const,
      title: "Access request: [system name]",
      body: "Please grant access to the specified system for the duration indicated.",
      fieldValues: { access_type: "read", duration: "7d" },
    },
    {
      systemKey: "emergency-deployment",
      name: "Emergency deployment",
      ticketTypeId: typeMap.deployment,
      priority: "URGENT" as const,
      title: "EMERGENCY: Deploy [service] [version]",
      body: "Emergency deployment required. Rollback plan must be documented before proceeding.",
      fieldValues: { deploy_window: "immediate" },
    },
    {
      systemKey: "sev1-incident",
      name: "Sev1 incident",
      ticketTypeId: typeMap.incident,
      priority: "URGENT" as const,
      title: "SEV1: [affected service] — [symptoms]",
      body: "Critical production incident. Immediate response required.",
      fieldValues: { severity: "sev1" },
    },
  ];

  for (const tpl of templates) {
    if (!tpl.ticketTypeId) continue;
    await prisma.ticketTemplate.upsert({
      where: { systemKey: tpl.systemKey },
      update: { name: tpl.name },
      create: {
        systemKey: tpl.systemKey,
        name: tpl.name,
        ticketTypeId: tpl.ticketTypeId,
        priority: tpl.priority,
        title: tpl.title,
        body: tpl.body,
        fieldValues: tpl.fieldValues,
      },
    });
  }

  console.log(`  Seeded ${templates.length} built-in templates`);
}

async function main() {
  await seedTicketTypes();
  await seedAutomationRules();
  await seedTemplates();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
