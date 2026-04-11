import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/auth/permissions";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !isStaffRole(user.role)) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const responses = await prisma.cannedResponse.findMany({
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess({ responses });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1),
  category: z.string().trim().max(60).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !isStaffRole(user.role)) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const payload = await parseRequestBody(request, createSchema);
    const response = await prisma.cannedResponse.create({
      data: { ...payload, createdBy: user.id },
    });
    return apiSuccess({ response }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
