import { PrismaClient, TicketActivityType, TicketStatus, UserRole } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";
import { DEFAULT_TICKET_TYPES } from "../modules/tickets/constants";

const prisma = new PrismaClient();

async function seedTicketTypes() {
  const ticketTypes = await Promise.all(
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

  return Object.fromEntries(ticketTypes.map((ticketType) => [ticketType.key, ticketType]));
}

async function seedUsers() {
  const users = [
    {
      email: "alex.hart@infralane.local",
      name: "Alex Hart",
      role: UserRole.ADMIN,
    },
    {
      email: "nina.cho@infralane.local",
      name: "Nina Cho",
      role: UserRole.ADMIN,
    },
    {
      email: "jordan.ellis@infralane.local",
      name: "Jordan Ellis",
      role: UserRole.OPERATOR,
    },
    {
      email: "samir.khan@infralane.local",
      name: "Samir Khan",
      role: UserRole.REQUESTER,
    },
    {
      email: "leila.morgan@infralane.local",
      name: "Leila Morgan",
      role: UserRole.REQUESTER,
    },
  ] as const;

  const passwordHash = hashPassword("password123");

  const seededUsers = await Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          role: user.role,
          passwordHash,
        },
        create: {
          email: user.email,
          name: user.name,
          role: user.role,
          passwordHash,
        },
      }),
    ),
  );

  return Object.fromEntries(seededUsers.map((user) => [user.email, user]));
}

async function seedSampleTickets() {
  const ticketCount = await prisma.ticket.count();

  if (ticketCount > 0) {
    return;
  }

  const ticketTypes = await seedTicketTypes();
  const users = await seedUsers();

  const accessTicket = await prisma.ticket.create({
    data: {
      title: "Grant production read access to Datadog",
      description: "On-call rotation needs temporary visibility into production dashboards for this week.",
      status: TicketStatus.IN_PROGRESS,
      requesterId: users["samir.khan@infralane.local"].id,
      assigneeId: users["alex.hart@infralane.local"].id,
      ticketTypeId: ticketTypes.access.id,
      fields: {
        create: [
          { key: "system", value: "Datadog" },
          { key: "environment", value: "production" },
          { key: "access_type", value: "read" },
          { key: "justification", value: "Primary on-call coverage for the payments team." },
        ],
      },
      activities: {
        create: [
          {
            actorId: users["samir.khan@infralane.local"].id,
            type: TicketActivityType.CREATED,
            message: "Ticket created as Access request.",
          },
          {
            actorId: users["alex.hart@infralane.local"].id,
            type: TicketActivityType.ASSIGNED,
            message: "Assigned ticket to Alex Hart.",
          },
          {
            actorId: users["alex.hart@infralane.local"].id,
            type: TicketActivityType.STATUS_CHANGED,
            message: "Status changed from OPEN to IN_PROGRESS.",
          },
        ],
      },
      comments: {
        create: [
          {
            authorId: users["alex.hart@infralane.local"].id,
            content: "I have the access group request queued. Expect an update within the hour.",
          },
        ],
      },
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: accessTicket.id,
      actorId: users["alex.hart@infralane.local"].id,
      type: TicketActivityType.COMMENTED,
      message: "Comment added to ticket.",
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Deploy billing-api v2.14.0 to production",
      description: "Need an assisted deployment during the low-traffic window after the schema migration completes.",
      status: TicketStatus.OPEN,
      requesterId: users["leila.morgan@infralane.local"].id,
      ticketTypeId: ticketTypes.deployment.id,
      fields: {
        create: [
          { key: "service_name", value: "billing-api" },
          { key: "environment", value: "production" },
          { key: "version", value: "v2.14.0" },
        ],
      },
      activities: {
        create: [
          {
            actorId: users["leila.morgan@infralane.local"].id,
            type: TicketActivityType.CREATED,
            message: "Ticket created as Deployment.",
          },
        ],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Provision a Redis cache for checkout service",
      description: "The checkout team needs a dedicated cache in staging before load testing next sprint.",
      status: TicketStatus.WAITING_FOR_REQUESTER,
      requesterId: users["samir.khan@infralane.local"].id,
      assigneeId: users["nina.cho@infralane.local"].id,
      ticketTypeId: ticketTypes.infra.id,
      fields: {
        create: [
          { key: "resource_type", value: "Redis cluster" },
          { key: "environment", value: "staging" },
          { key: "requested_change", value: "Provision a shared-nothing cache with 2 GB memory." },
        ],
      },
      activities: {
        create: [
          {
            actorId: users["samir.khan@infralane.local"].id,
            type: TicketActivityType.CREATED,
            message: "Ticket created as Infrastructure.",
          },
          {
            actorId: users["nina.cho@infralane.local"].id,
            type: TicketActivityType.ASSIGNED,
            message: "Assigned ticket to Nina Cho.",
          },
          {
            actorId: users["nina.cho@infralane.local"].id,
            type: TicketActivityType.STATUS_CHANGED,
            message: "Status changed from OPEN to WAITING_FOR_REQUESTER.",
          },
        ],
      },
      comments: {
        create: [
          {
            authorId: users["nina.cho@infralane.local"].id,
            content: "Please confirm whether this cache should be single-AZ or multi-AZ.",
          },
        ],
      },
    },
  });
}

async function seedAutomationRules() {
  const rules = [
    {
      systemKey: "auto-assign-urgent-incidents",
      name: "Auto-assign urgent incidents",
      trigger: "TICKET_CREATED" as const,
      conditions: { ticketType: "incident", priority: "URGENT" },
      action: "ASSIGN_TO" as const,
      actionValue: "auto", // placeholder — first admin will be resolved at execution time
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
  await seedUsers();
  await seedSampleTickets();
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
