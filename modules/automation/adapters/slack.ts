import { env } from "@/lib/env";
import type { ActionAdapter, AdapterParams, AdapterResult } from "./types";

type SlackConfig = {
  webhookUrl?: string;
  botToken?: string;
  signingSecret?: string;
  defaultChannel?: string;
};

export const slackAdapter: ActionAdapter = {
  name: "slack",

  async execute(params: AdapterParams): Promise<AdapterResult> {
    const config = params.config as SlackConfig;

    if (!config.webhookUrl) {
      return { success: false, detail: "Slack webhook URL not configured" };
    }

    const channel = params.actionValue || config.defaultChannel;
    const appUrl = env.INFRALANE_BASE_URL;

    const payload = {
      channel,
      text: `Automation: *${params.ruleName}*`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${params.ruleName}*\nTriggered on <${appUrl}/tickets/${params.ticketId}|${params.ticketRef}>`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Rule: ${params.ruleId} | <${appUrl}/tickets/${params.ticketId}|View ticket>`,
            },
          ],
        },
      ],
    };

    try {
      const res = await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { success: false, detail: `Slack returned ${res.status}: ${body}` };
      }

      return { success: true, detail: `Sent to ${channel ?? "default channel"}` };
    } catch (error) {
      return {
        success: false,
        detail: error instanceof Error ? error.message : "Slack request failed",
      };
    }
  },
};

/**
 * Send an interactive approval message to Slack with Approve/Reject buttons.
 */
export async function postInteractiveApproval(
  config: SlackConfig,
  approvalId: string,
  ticketRef: string,
  ticketId: string,
  ruleName: string
): Promise<AdapterResult> {
  if (!config.botToken || !config.defaultChannel) {
    return { success: false, detail: "Slack bot token or default channel not configured" };
  }

  const appUrl = env.INFRALANE_BASE_URL;

  const payload = {
    channel: config.defaultChannel,
    text: `Approval required: ${ruleName}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Approval Required*\nRule *${ruleName}* triggered on <${appUrl}/tickets/${ticketId}|${ticketRef}>`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Approve" },
            style: "primary",
            action_id: "approval_approve",
            value: approvalId,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Reject" },
            style: "danger",
            action_id: "approval_reject",
            value: approvalId,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.botToken}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    if (!data.ok) {
      return { success: false, detail: `Slack API error: ${data.error}` };
    }

    return { success: true, detail: "Interactive approval sent", externalRef: data.ts };
  } catch (error) {
    return {
      success: false,
      detail: error instanceof Error ? error.message : "Slack request failed",
    };
  }
}
