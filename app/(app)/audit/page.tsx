import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/auth/permissions";
import { AuditLogPage } from "@/components/audit/audit-log-page";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export default async function AuditPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !isStaffRole(sessionUser.role)) {
    redirect("/tickets");
  }

  return (
    <div className="space-y-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Audit Log</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div>
        <h1 className="text-2xl font-semibold tracking-heading text-foreground">
          Audit Log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Global activity log across all tickets.
        </p>
      </div>

      <AuditLogPage />
    </div>
  );
}
