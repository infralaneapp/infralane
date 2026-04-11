import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/auth/permissions";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";

    if (q.length < 2) {
      return apiSuccess({ tickets: [] });
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        ...(!isStaffRole(user.role) ? { requesterId: user.id } : {}),
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { requester: { name: { contains: q, mode: "insensitive" } } },
          { comments: { some: { content: { contains: q, mode: "insensitive" } } } },
          { fields: { some: { value: { contains: q, mode: "insensitive" } } } },
          { activities: { some: { message: { contains: q, mode: "insensitive" } } } },
        ],
      },
      select: {
        id: true,
        sequence: true,
        title: true,
        status: true,
        priority: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    const results = tickets.map((t) => ({
      id: t.id,
      reference: `INF-${t.sequence.toString().padStart(4, "0")}`,
      title: t.title,
      status: t.status,
      priority: t.priority,
    }));

    return apiSuccess({ tickets: results });
  } catch (error) {
    return handleApiError(error);
  }
}
