import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const config = await prisma.businessHoursConfig.findFirst({
      where: { isDefault: true },
    });

    return apiSuccess({ config });
  } catch (error) {
    return handleApiError(error);
  }
}

const businessHoursSchema = z.object({
  timezone: z.string().min(1).max(100),
  schedule: z.record(
    z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    }),
  ),
  holidays: z.array(z.string()),
});

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const payload = await parseRequestBody(req, businessHoursSchema);

    const existing = await prisma.businessHoursConfig.findFirst({
      where: { isDefault: true },
    });

    let config;
    if (existing) {
      config = await prisma.businessHoursConfig.update({
        where: { id: existing.id },
        data: {
          timezone: payload.timezone,
          schedule: payload.schedule,
          holidays: payload.holidays,
        },
      });
    } else {
      config = await prisma.businessHoursConfig.create({
        data: {
          name: "default",
          isDefault: true,
          timezone: payload.timezone,
          schedule: payload.schedule,
          holidays: payload.holidays,
        },
      });
    }

    return apiSuccess({ config });
  } catch (error) {
    return handleApiError(error);
  }
}
