import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/auth/permissions";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });
    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    return apiSuccess({ tags });
  } catch (error) {
    return handleApiError(error);
  }
}

const createTagSchema = z.object({
  name: z.string().trim().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6b7280"),
});

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !isStaffRole(user.role)) return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    const payload = await parseRequestBody(req, createTagSchema);
    const tag = await prisma.tag.create({ data: payload });
    return apiSuccess({ tag }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
