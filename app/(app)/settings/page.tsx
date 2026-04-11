import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";

export default async function SettingsPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !hasPermission(sessionUser.role, "settings:manage")) {
    redirect("/tickets");
  }

  redirect("/settings/ticket-types");
}
