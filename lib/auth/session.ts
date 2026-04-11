import { createHmac } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";

const SESSION_COOKIE_NAME = "infralane_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

function getSessionSecret(): string {
  const secret = process.env.INFRALANE_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: INFRALANE_SESSION_SECRET is missing or shorter than 32 characters. " +
        "Sessions cannot be signed securely. Set this environment variable before starting in production."
      );
    }
    // Fallback for dev only
    return "dev-only-insecure-session-secret-min32chars";
  }
  return secret;
}

function signToken(userId: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${userId}.${timestamp}`;
  const signature = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (!userId || isNaN(timestamp) || !signature) return null;

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > SESSION_MAX_AGE) return null;

  // Verify signature
  const expectedPayload = `${userId}.${timestamp}`;
  const expectedSignature = createHmac("sha256", getSessionSecret())
    .update(expectedPayload)
    .digest("hex");

  if (signature !== expectedSignature) return null;

  return userId;
}

const sessionUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  onboarded: true,
} satisfies Prisma.UserSelect;

export type SessionUser = Prisma.UserGetPayload<{
  select: typeof sessionUserSelect;
}>;

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  const token = signToken(userId);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionUser() {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: sessionUserSelect,
  });
}
