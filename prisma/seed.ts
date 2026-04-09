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
      email: "alex.hart@opsflow.local",
      name: "Alex Hart",
      role: UserRole.DEVOPS,
    },
    {
      email: "nina.cho@opsflow.local",
      name: "Nina Cho",
      role: UserRole.DEVOPS,
    },
    {
      email: "samir.khan@opsflow.local",
      name: "Samir Khan",
      role: UserRole.REQUESTER,
    },
    {
      email: "leila.morgan@opsflow.local",
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
      requesterId: users["samir.khan@opsflow.local"].id,
      assigneeId: users["alex.hart@opsflow.local"].id,
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
            actorId: users["samir.khan@opsflow.local"].id,
            type: TicketActivityType.CREATED,
            message: "Ticket created as Access request.",
          },
          {
            actorId: users["alex.hart@opsflow.local"].id,
            type: TicketActivityType.ASSIGNED,
            message: "Assigned ticket to Alex Hart.",
          },
          {
            actorId: users["alex.hart@opsflow.local"].id,
            type: TicketActivityType.STATUS_CHANGED,
            message: "Status changed from OPEN to IN_PROGRESS.",
          },
        ],
      },
      comments: {
        create: [
          {
            authorId: users["alex.hart@opsflow.local"].id,
            content: "I have the access group request queued. Expect an update within the hour.",
          },
        ],
      },
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: accessTicket.id,
      actorId: users["alex.hart@opsflow.local"].id,
      type: TicketActivityType.COMMENTED,
      message: "Comment added to ticket.",
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Deploy billing-api v2.14.0 to production",
      description: "Need an assisted deployment during the low-traffic window after the schema migration completes.",
      status: TicketStatus.OPEN,
      requesterId: users["leila.morgan@opsflow.local"].id,
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
            actorId: users["leila.morgan@opsflow.local"].id,
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
      requesterId: users["samir.khan@opsflow.local"].id,
      assigneeId: users["nina.cho@opsflow.local"].id,
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
            actorId: users["samir.khan@opsflow.local"].id,
            type: TicketActivityType.CREATED,
            message: "Ticket created as Infrastructure.",
          },
          {
            actorId: users["nina.cho@opsflow.local"].id,
            type: TicketActivityType.ASSIGNED,
            message: "Assigned ticket to Nina Cho.",
          },
          {
            actorId: users["nina.cho@opsflow.local"].id,
            type: TicketActivityType.STATUS_CHANGED,
            message: "Status changed from OPEN to WAITING_FOR_REQUESTER.",
          },
        ],
      },
      comments: {
        create: [
          {
            authorId: users["nina.cho@opsflow.local"].id,
            content: "Please confirm whether this cache should be single-AZ or multi-AZ.",
          },
        ],
      },
    },
  });
}

async function main() {
  await seedTicketTypes();
  await seedUsers();
  await seedSampleTickets();
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
