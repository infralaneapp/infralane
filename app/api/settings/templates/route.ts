import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/permissions";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { TICKET_PRIORITY_VALUES } from "@/modules/tickets/constants";

const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  ticketTypeId: z.string().cuid(),
  priority: z.enum(TICKET_PRIORITY_VALUES).default("MEDIUM"),
  title: z.string().trim().max(160).optional(),
  body: z.string().trim().max(4000).optional(),
  fieldValues: z.record(z.string()).default({}),
});

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });

    const templates = await prisma.ticketTemplate.findMany({
      orderBy: { name: "asc" },
      include: { ticketType: { select: { id: true, key: true, name: true } } },
    });
    return apiSuccess({ templates });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }
    const payload = await parseRequestBody(request, createTemplateSchema);
    const template = await prisma.ticketTemplate.create({ data: payload });
    revalidatePath("/tickets/new");
    return apiSuccess({ template }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
