import { redirect } from "next/navigation";
import { BarChart3, Ticket, Clock, Users, Bot, AlertTriangle } from "lucide-react";

import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/auth/permissions";
import { getTicketStats } from "@/modules/tickets/stats";
import type { StatsFilters } from "@/modules/tickets/stats";
import { formatTicketStatus } from "@/lib/formatters";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { SimpleBarChart, SimpleDonut, TrendChart } from "@/components/dashboard/charts";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { prisma } from "@/lib/db";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "hsl(234, 40%, 60%)",
  IN_PROGRESS: "hsl(38, 84%, 44%)",
  WAITING_FOR_REQUESTER: "hsl(263, 70%, 58%)",
  RESOLVED: "hsl(160, 60%, 45%)",
  CLOSED: "hsl(0, 0%, 50%)",
};

async function getWeeklyTrend() {
  const data: { week: string; created: number; resolved: number }[] = [];
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
    data.push({ week: label, created, resolved });
  }
  return data;
}

async function getAutomationHealth() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [queued, succeeded24h, failed24h, deadLettered] = await Promise.all([
    prisma.automationJob.count({ where: { status: "QUEUED" } }),
    prisma.automationJob.count({ where: { status: "SUCCEEDED", completedAt: { gte: oneDayAgo } } }),
    prisma.automationJob.count({ where: { status: "FAILED", completedAt: { gte: oneDayAgo } } }),
    prisma.automationJob.count({ where: { status: "DEAD_LETTER" } }),
  ]);
  return { queued, succeeded24h, failed24h, deadLettered };
}

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  if (!isStaffRole(sessionUser.role)) {
    redirect("/tickets");
  }

  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : undefined;
  const to = typeof params.to === "string" ? params.to : undefined;
  const type = typeof params.type === "string" ? params.type : undefined;
  const priority = typeof params.priority === "string" ? params.priority : undefined;
  const assigneeId = typeof params.assigneeId === "string" ? params.assigneeId : undefined;

  const filters: StatsFilters = { from, to, type, priority, assigneeId };

  const ticketTypes = await prisma.ticketType.findMany({
    where: { archived: false },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const [stats, weeklyTrend, automationHealth] = await Promise.all([
    getTicketStats(sessionUser, filters),
    getWeeklyTrend(),
    getAutomationHealth(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-heading text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of operational ticket activity.
          </p>
        </div>
        <DashboardFilters
          currentFrom={from}
          currentTo={to}
          currentType={type}
          currentPriority={priority}
          ticketTypes={ticketTypes}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Ticket className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-foreground">{stats.total}</p>
              <p className="text-[13px] text-muted-foreground">Total tickets</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {stats.byStatus.find((s) => s.status === "OPEN")?.count ?? 0}
              </p>
              <p className="text-[13px] text-muted-foreground">Open</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <BarChart3 className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {stats.byStatus.find((s) => s.status === "RESOLVED")?.count ?? 0}
              </p>
              <p className="text-[13px] text-muted-foreground">Resolved</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-foreground">{stats.recentCount}</p>
              <p className="text-[13px] text-muted-foreground">This week</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <SimpleDonut
          title="By Status"
          data={stats.byStatus.map((s) => ({
            label: formatTicketStatus(s.status as any),
            value: s.count,
            color: STATUS_COLORS[s.status] ?? "#6b7280",
          }))}
        />
        <SimpleBarChart
          title="By Type"
          data={stats.byType.map((t) => ({ label: t.type, value: t.count }))}
        />
      </div>

      <TrendChart title="Weekly Trend (8 weeks)" data={weeklyTrend} />

      <Card className="p-5 shadow-card">
        <h2 className="text-sm font-semibold text-foreground">By Assignee</h2>
        <div className="mt-4 space-y-3">
          {stats.byAssignee.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assigned tickets yet.</p>
          ) : (
            stats.byAssignee.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserAvatar name={item.name} size="sm" />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-foreground">{item.count}</span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Automation Health */}
      <Card className="p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">Automation Health</h2>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-center">
            <p className="text-2xl font-semibold text-foreground">{automationHealth.queued}</p>
            <p className="text-xs text-muted-foreground">Queued</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-center">
            <p className="text-2xl font-semibold text-green-600">{automationHealth.succeeded24h}</p>
            <p className="text-xs text-muted-foreground">Succeeded (24h)</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-center">
            <p className="text-2xl font-semibold text-destructive">{automationHealth.failed24h}</p>
            <p className="text-xs text-muted-foreground">Failed (24h)</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1">
              {automationHealth.deadLettered > 0 && <AlertTriangle className="size-4 text-amber-600" />}
              <p className="text-2xl font-semibold text-amber-600">{automationHealth.deadLettered}</p>
            </div>
            <p className="text-xs text-muted-foreground">Dead-lettered</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
