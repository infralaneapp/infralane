import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });
    const filters = await prisma.savedFilter.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    });
    return apiSuccess({ filters });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  filters: z.record(z.string()),
});

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });
    const payload = await parseRequestBody(req, createSchema);
    const filter = await prisma.savedFilter.create({
      data: { userId: user.id, name: payload.name, filters: payload.filters },
    });
    return apiSuccess({ filter }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
