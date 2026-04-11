import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { assertTicketAccess } from "@/modules/tickets/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });
    const { id } = await ctx.params;
    await assertTicketAccess(id, user);
    const attachments = await prisma.attachment.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess({ attachments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });
    const { id } = await ctx.params;
    await assertTicketAccess(id, user);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return apiError("No file provided.", { status: 400, code: "NO_FILE" });

    if (file.size > 10 * 1024 * 1024) {
      return apiError("File too large (max 10MB).", { status: 400, code: "FILE_TOO_LARGE" });
    }

    const uploadDir = join(process.cwd(), "uploads", id);
    await mkdir(uploadDir, { recursive: true });

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = join(uploadDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const attachment = await prisma.attachment.create({
      data: {
        ticketId: id,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        path: `/api/tickets/${id}/attachments/${safeName}`,
      },
    });

    revalidatePath(`/tickets/${id}`);
    return apiSuccess({ attachment }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
