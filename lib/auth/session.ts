import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";

const SESSION_COOKIE_NAME = "opsflow_session";

const sessionUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
} satisfies Prisma.UserSelect;

export type SessionUser = Prisma.UserGetPayload<{
  select: typeof sessionUserSelect;
}>;

export async function createSession(userId: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUserId() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
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
