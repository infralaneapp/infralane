import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { approveRequest, rejectRequest } from "@/modules/approvals/service";

/**
 * Verify Slack request signature using HMAC-SHA256.
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
function verifySlackSignature(
  signingSecret: string,
  signature: string | null,
  timestamp: string | null,
  rawBody: string
): boolean {
  if (!signature || !timestamp) return false;

  // Reject requests older than 5 minutes (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const expectedSignature =
    "v0=" + createHmac("sha256", signingSecret).update(baseString).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    const config = await prisma.integrationConfig.findUnique({
      where: { provider: "slack" },
    });
    if (!config?.enabled) {
      return NextResponse.json({ error: "Slack not configured" }, { status: 503 });
    }

    const slackConfig = config.config as Record<string, unknown>;
    const signingSecret = slackConfig.signingSecret as string | undefined;

    if (!signingSecret) {
      return NextResponse.json({ error: "Slack signing secret not configured" }, { status: 503 });
    }

    // Verify Slack signature
    const slackSignature = request.headers.get("x-slack-signature");
    const slackTimestamp = request.headers.get("x-slack-request-timestamp");

    if (!verifySlackSignature(signingSecret, slackSignature, slackTimestamp, rawBody)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse form data from raw body
    const params = new URLSearchParams(rawBody);
    const payloadStr = params.get("payload");
    if (!payloadStr) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const payload = JSON.parse(payloadStr);

    const action = payload.actions?.[0];
    if (!action) {
      return NextResponse.json({ error: "No action" }, { status: 400 });
    }

    const approvalId = action.value;
    const slackUserId = payload.user?.id;

    if (!slackUserId) {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Could not identify Slack user.",
      });
    }

    // Map Slack user to Infralane user
    const infralaneUser = await prisma.user.findFirst({ where: { slackUserId } });

    if (!infralaneUser || (infralaneUser.role !== "OPERATOR" && infralaneUser.role !== "ADMIN")) {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Not authorized. Your Slack account is not linked to an Infralane operator/admin account.",
      });
    }

    const actor = { id: infralaneUser.id, role: infralaneUser.role };

    if (action.action_id === "approval_approve") {
      await approveRequest(approvalId, actor);
      return NextResponse.json({
        response_type: "in_channel",
        replace_original: true,
        text: `Approved by ${infralaneUser.name}`,
      });
    }

    if (action.action_id === "approval_reject") {
      await rejectRequest(approvalId, actor, "Rejected via Slack");
      return NextResponse.json({
        response_type: "in_channel",
        replace_original: true,
        text: `Rejected by ${infralaneUser.name}`,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[slack-interactions] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
