import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { SettingsNav, SettingsNavMobile } from "./settings-nav";

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !hasPermission(sessionUser.role, "settings:manage")) {
    redirect("/tickets");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-heading text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage ticket types, templates, and team members.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <SettingsNav />
        </aside>
        <div className="lg:hidden">
          <SettingsNavMobile />
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
