import { NextResponse } from "next/server";

import { env } from "@/lib/env";

/**
 * Initiates Slack OAuth "Sign in with Slack" flow.
 * Redirects the user to Slack's authorization page.
 */
export async function GET() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = `${env.INFRALANE_BASE_URL}/api/auth/slack/callback`;

  if (!clientId) {
    return NextResponse.json(
      { success: false, error: { message: "Slack OAuth not configured." } },
      { status: 503 }
    );
  }

  // Slack's "Sign in with Slack" v2 uses OpenID Connect scopes
  const scopes = "openid,email,profile";
  const state = crypto.randomUUID(); // CSRF protection

  const url = new URL("https://slack.com/openid/connect/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", crypto.randomUUID());

  // Store state in a short-lived cookie for CSRF validation
  const response = NextResponse.redirect(url.toString());
  response.cookies.set("slack_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });

  return response;
}
