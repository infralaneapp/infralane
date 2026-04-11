import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/auth/permissions";
import { SlaReport } from "@/components/reports/sla-report";
import { RatingsReport } from "@/components/reports/ratings-report";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export default async function ReportsPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !isStaffRole(sessionUser.role)) {
    redirect("/tickets");
  }

  return (
    <div className="space-y-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Reports</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div>
        <h1 className="text-2xl font-semibold tracking-heading text-foreground">
          Reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SLA performance, satisfaction ratings, and weekly activity trends.
        </p>
      </div>

      <h2 className="text-lg font-semibold text-foreground">SLA Compliance</h2>
      <SlaReport />

      <h2 className="text-lg font-semibold text-foreground pt-4">Customer Satisfaction</h2>
      <RatingsReport />
    </div>
  );
}
