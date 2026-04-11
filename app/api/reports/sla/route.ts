import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";
import { getSlaThresholds } from "@/lib/sla";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "reports:view")) return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });

    const SLA_TARGETS = await getSlaThresholds();

    const tickets = await prisma.ticket.findMany({
      where: { status: { in: ["RESOLVED", "CLOSED"] } },
      select: { priority: true, createdAt: true, firstResponseAt: true, resolvedAt: true },
    });

    const stats: Record<string, { total: number; responseMet: number; resolutionMet: number }> = {};

    for (const p of ["URGENT", "HIGH", "MEDIUM", "LOW"]) {
      stats[p] = { total: 0, responseMet: 0, resolutionMet: 0 };
    }

    for (const t of tickets) {
      const s = stats[t.priority];
      if (!s) continue;
      s.total++;
      const target = SLA_TARGETS[t.priority];
      if (!target) continue;
      if (t.firstResponseAt) {
        const responseMs = t.firstResponseAt.getTime() - t.createdAt.getTime();
        if (responseMs <= target.responseHours * 3600000) s.responseMet++;
      }
      if (t.resolvedAt) {
        const resolveMs = t.resolvedAt.getTime() - t.createdAt.getTime();
        if (resolveMs <= target.resolutionHours * 3600000) s.resolutionMet++;
      }
    }

    // Tickets by week (last 8 weeks)
    const weeklyData: { week: string; created: number; resolved: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - (i + 1) * 7);
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const label = start.toLocaleDateString("en", { month: "short", day: "numeric" });

      const [created, resolved] = await Promise.all([
        prisma.ticket.count({ where: { createdAt: { gte: start, lt: end } } }),
        prisma.ticket.count({ where: { resolvedAt: { gte: start, lt: end } } }),
      ]);
      weeklyData.push({ week: label, created, resolved });
    }

    return apiSuccess({ slaStats: stats, weeklyData });
  } catch (error) {
    return handleApiError(error);
  }
}
