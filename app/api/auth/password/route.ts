import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });

    const { currentPassword, newPassword } = await parseRequestBody(req, changePasswordSchema);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!dbUser || !verifyPassword(currentPassword, dbUser.passwordHash)) {
      return apiError("Current password is incorrect.", { status: 400, code: "WRONG_PASSWORD" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(newPassword) },
    });

    return apiSuccess({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
