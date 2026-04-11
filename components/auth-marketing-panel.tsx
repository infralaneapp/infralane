import { LayoutList, Users, ClipboardCheck, Shield } from "lucide-react";

import { Card } from "@/components/ui/card";

export function AuthMarketingPanel() {
  return (
    <Card className="flex flex-col justify-center p-8 shadow-card lg:p-10">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayoutList className="size-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-foreground">Infralane</span>
      </div>

      <h1 className="mt-6 text-[28px] font-semibold leading-tight tracking-heading text-foreground">
        One queue. Structured intake. Full traceability.
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Replace ad-hoc handoffs with a structured ops queue and auditable execution trail.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <Users className="size-4 text-primary" />
          <p className="mt-2.5 text-sm font-medium text-foreground">Shared queue</p>
          <p className="mt-1 text-[13px] text-muted-foreground">All incoming ops work lands in one place.</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <ClipboardCheck className="size-4 text-primary" />
          <p className="mt-2.5 text-sm font-medium text-foreground">Structured requests</p>
          <p className="mt-1 text-[13px] text-muted-foreground">Each request type captures exactly what operators need.</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <Shield className="size-4 text-primary" />
          <p className="mt-2.5 text-sm font-medium text-foreground">Full auditability</p>
          <p className="mt-1 text-[13px] text-muted-foreground">Every assignment, state change, and comment is traceable.</p>
        </div>
      </div>
    </Card>
  );
}
