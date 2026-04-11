import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody, type RouteContext } from "@/lib/http";
import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/auth/permissions";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  content: z.string().trim().min(1).optional(),
  category: z.string().trim().max(60).nullable().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user || !isStaffRole(user.role)) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }
    const { id } = await context.params;
    const payload = await parseRequestBody(request, updateSchema);
    const response = await prisma.cannedResponse.update({
      where: { id },
      data: payload,
    });
    return apiSuccess({ response });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user || !isStaffRole(user.role)) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }
    const { id } = await context.params;
    await prisma.cannedResponse.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
