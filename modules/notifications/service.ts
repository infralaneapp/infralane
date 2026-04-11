import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { broadcastToUser } from "@/lib/sse";

export async function createNotification(input: {
  userId: string;
  title: string;
  message: string;
  href?: string;
}) {
  const notification = await prisma.notification.create({ data: input });

  // Fan-out: push via SSE for instant notification bell updates
  broadcastToUser(input.userId, "notification", {
    id: notification.id,
    title: input.title,
    message: input.message,
    href: input.href,
  });

  // Fetch user and Slack config once for all fan-out channels
  const [user, slackConfig] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, slackUserId: true },
    }),
    prisma.integrationConfig.findUnique({ where: { provider: "slack" } }),
  ]);

  const botToken = slackConfig?.enabled
    ? ((slackConfig.config as Record<string, unknown>)?.botToken as string | null) ?? null
    : null;

  // Fan-out: send Slack DM if user has a linked Slack account and integration is enabled
  sendSlackDM(user?.slackUserId ?? null, botToken, input.title, input.message, input.href).catch(() => {});

  // Fan-out: send email if user has email and SMTP is configured
  sendEmailNotification(user?.email ?? null, input.title, input.message, input.href).catch(() => {});

  return notification;
}

/**
 * Send a Slack DM to a user if they have a slackUserId and Slack integration is enabled.
 */
async function sendSlackDM(slackUserId: string | null, botToken: string | null, title: string, message: string, href?: string) {
  if (!slackUserId || !botToken) return;

  const text = href ? `*${title}*\n${message}\n<${env.INFRALANE_BASE_URL}${href}|View in Infralane>` : `*${title}*\n${message}`;

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      channel: slackUserId, // DM by Slack user ID
      text,
      unfurl_links: false,
    }),
    signal: AbortSignal.timeout(10000),
  });
}

/**
 * Send an email notification to a user if they have an email address and SMTP is configured.
 */
async function sendEmailNotification(email: string | null, title: string, message: string, href?: string) {
  if (!email) return;

  const link = href ? `${env.INFRALANE_BASE_URL}${href}` : undefined;
  const text = link ? `${title}\n\n${message}\n\nView: ${link}` : `${title}\n\n${message}`;
  const html = link
    ? `<strong>${title}</strong><p>${message}</p><p><a href="${link}">View in Infralane</a></p>`
    : `<strong>${title}</strong><p>${message}</p>`;

  await sendEmail({ to: email, subject: title, text, html });
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function markRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}

export async function notifyStatusChange(ticketId: string, ticketRef: string, requesterId: string, newStatus: string) {
  await createNotification({
    userId: requesterId,
    title: "Status updated",
    message: `${ticketRef} is now ${newStatus.replace(/_/g, " ").toLowerCase()}.`,
    href: `/tickets/${ticketId}`,
  });
}

export async function notifyAssignment(ticketId: string, ticketRef: string, assigneeId: string) {
  await createNotification({
    userId: assigneeId,
    title: "Ticket assigned",
    message: `You were assigned to ${ticketRef}.`,
    href: `/tickets/${ticketId}`,
  });
}

export async function notifyComment(ticketId: string, ticketRef: string, recipientId: string, authorName: string) {
  await createNotification({
    userId: recipientId,
    title: "New comment",
    message: `${authorName} commented on ${ticketRef}.`,
    href: `/tickets/${ticketId}`,
  });
}
