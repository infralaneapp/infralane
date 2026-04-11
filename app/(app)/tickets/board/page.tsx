import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/auth/permissions";
import { BoardView } from "@/components/tickets/board-view";

export default async function TicketBoardPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return null;
  }

  if (!isStaffRole(sessionUser.role)) {
    redirect("/tickets");
  }

  return <BoardView currentUserId={sessionUser.id} />;
}
