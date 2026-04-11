import { getSessionUser } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/auth/permissions";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const type = url.searchParams.get("type") || undefined;

    const tickets = await prisma.ticket.findMany({
      where: {
        ...(!isStaffRole(user.role) ? { requesterId: user.id } : {}),
        status: status as any,
        ticketType: type ? { key: type } : undefined,
      },
      include: {
        requester: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } },
        ticketType: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const header = "Reference,Title,Type,Status,Priority,Requester,Assignee,Created,Updated\n";
    const rows = tickets.map((t) => {
      const ref = `INF-${t.sequence.toString().padStart(4, "0")}`;
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      return [
        ref,
        esc(t.title),
        t.ticketType.name,
        t.status,
        t.priority,
        t.requester.name,
        t.assignee?.name ?? "",
        t.createdAt.toISOString(),
        t.updatedAt.toISOString(),
      ].join(",");
    }).join("\n");

    return new Response(header + rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tickets-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
