"use client";

import { Card } from "@/components/ui/card";

type BarChartProps = {
  title: string;
  data: { label: string; value: number; color?: string }[];
};

export function SimpleBarChart({ title, data }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card className="p-5 shadow-card">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-4 space-y-2.5">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">{item.label}</span>
            <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  backgroundColor: item.color ?? "hsl(var(--primary))",
                  minWidth: item.value > 0 ? "8px" : "0",
                }}
              />
            </div>
            <span className="w-8 text-right text-xs font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

type DonutProps = {
  title: string;
  data: { label: string; value: number; color: string }[];
};

export function SimpleDonut({ title, data }: DonutProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulative = 0;

  const segments = data.map((d) => {
    const start = (cumulative / (total || 1)) * 100;
    cumulative += d.value;
    const end = (cumulative / (total || 1)) * 100;
    return { ...d, start, end };
  });

  // Build conic-gradient
  const gradient = segments
    .map((s) => `${s.color} ${s.start}% ${s.end}%`)
    .join(", ");

  return (
    <Card className="p-5 shadow-card">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-4 flex items-center gap-6">
        <div
          className="size-28 shrink-0 rounded-full"
          style={{
            background: total > 0 ? `conic-gradient(${gradient})` : "hsl(var(--muted))",
            mask: "radial-gradient(circle at center, transparent 40%, black 41%)",
            WebkitMask: "radial-gradient(circle at center, transparent 40%, black 41%)",
          }}
        />
        <div className="space-y-1.5">
          {data.map((d) => (
            <div key={d.label} className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-xs text-muted-foreground">{d.label}</span>
              <span className="text-xs font-medium text-foreground">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

type TrendProps = {
  title: string;
  data: { label?: string; week?: string; created: number; resolved: number }[];
};

export function TrendChart({ title, data }: TrendProps) {
  const max = Math.max(...data.flatMap((d) => [d.created, d.resolved]), 1);

  return (
    <Card className="p-5 shadow-card">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-4 flex items-end gap-1.5" style={{ height: "120px" }}>
        {data.map((week) => (
          <div key={week.label ?? week.week} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end gap-0.5" style={{ height: "100px" }}>
              <div
                className="flex-1 rounded-t bg-primary/70 transition-all duration-500"
                style={{ height: `${(week.created / max) * 100}%`, minHeight: week.created > 0 ? "4px" : "0" }}
                title={`Created: ${week.created}`}
              />
              <div
                className="flex-1 rounded-t bg-emerald-500/70 transition-all duration-500"
                style={{ height: `${(week.resolved / max) * 100}%`, minHeight: week.resolved > 0 ? "4px" : "0" }}
                title={`Resolved: ${week.resolved}`}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">{week.label ?? week.week}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded bg-primary/70" />
          <span className="text-[10px] text-muted-foreground">Created</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded bg-emerald-500/70" />
          <span className="text-[10px] text-muted-foreground">Resolved</span>
        </div>
      </div>
    </Card>
  );
}
