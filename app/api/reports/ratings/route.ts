import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/auth/permissions";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !isStaffRole(user.role)) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const ratings = await prisma.ticketRating.findMany({
      include: {
        ticket: {
          select: { sequence: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute stats
    const total = ratings.length;
    let sum = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const r of ratings) {
      sum += r.rating;
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating]++;
      }
    }

    const average = total > 0 ? Math.round((sum / total) * 100) / 100 : 0;

    // Fetch user names for recent ratings
    const recent = ratings.slice(0, 20);
    const userIds = [...new Set(recent.map((r) => r.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const recentRatings = recent.map((r) => {
      const u = userMap.get(r.userId);
      return {
        id: r.id,
        ticketSequence: r.ticket.sequence,
        ticketTitle: r.ticket.title,
        rating: r.rating,
        comment: r.comment,
        userName: u?.name ?? u?.email ?? "Unknown",
        createdAt: r.createdAt.toISOString(),
      };
    });

    return apiSuccess({ average, total, distribution, recentRatings });
  } catch (error) {
    return handleApiError(error);
  }
}
