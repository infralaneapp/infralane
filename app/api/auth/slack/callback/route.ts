import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";

type SlackTokenResponse = {
  ok: boolean;
  access_token?: string;
  id_token?: string;
  error?: string;
};

type SlackUserInfo = {
  ok: boolean;
  sub?: string; // Slack user ID
  email?: string;
  name?: string;
  picture?: string;
  error?: string;
};

/**
 * Slack OAuth callback. Exchanges the authorization code for tokens,
 * fetches user info, and either links to existing account or creates new one.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const baseUrl = env.INFRALANE_BASE_URL;

  // Handle Slack errors (user denied, etc.)
  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=slack_${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=missing_code`);
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const storedState = cookieStore.get("slack_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_state`);
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/auth/slack/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/login?error=slack_not_configured`);
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://slack.com/api/openid.connect.token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData: SlackTokenResponse = await tokenRes.json();
    if (!tokenData.ok || !tokenData.access_token) {
      console.error("[slack-oauth] Token exchange failed:", tokenData.error);
      return NextResponse.redirect(`${baseUrl}/login?error=slack_token_failed`);
    }

    // Fetch user info
    const userRes = await fetch("https://slack.com/api/openid.connect.userInfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo: SlackUserInfo = await userRes.json();
    if (!userInfo.ok || !userInfo.email || !userInfo.sub) {
      console.error("[slack-oauth] User info failed:", userInfo.error);
      return NextResponse.redirect(`${baseUrl}/login?error=slack_user_failed`);
    }

    const normalizedEmail = userInfo.email.toLowerCase();
    const slackUserId = userInfo.sub;

    // Try to find existing user by email
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, slackUserId: true },
    });

    if (user) {
      // Link Slack ID if not already set
      if (user.slackUserId !== slackUserId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { slackUserId },
        });
      }
    } else {
      // Create new user from Slack profile
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: userInfo.name ?? normalizedEmail.split("@")[0],
          slackUserId,
          passwordHash: hashPassword(crypto.randomUUID()), // random password — they'll use Slack to login
          role: "REQUESTER",
        },
        select: { id: true, slackUserId: true },
      });
    }

    // Create session and redirect
    await createSession(user.id);

    // Clear the CSRF cookie
    const response = NextResponse.redirect(`${baseUrl}/tickets`);
    response.cookies.delete("slack_oauth_state");
    return response;
  } catch (err) {
    console.error("[slack-oauth] Unexpected error:", err);
    return NextResponse.redirect(`${baseUrl}/login?error=slack_unexpected`);
  }
}
