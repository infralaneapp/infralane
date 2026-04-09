import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { getTicketById, updateTicket } from "@/modules/tickets/service";
import { updateTicketSchema } from "@/modules/tickets/schemas";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return apiError("Authentication required.", {
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const { id } = await context.params;
    const ticket = await getTicketById(id, sessionUser);

    if (!ticket) {
      return apiError("Ticket not found.", {
        status: 404,
        code: "TICKET_NOT_FOUND",
      });
    }

    return apiSuccess({ ticket });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return apiError("Authentication required.", {
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const { id } = await context.params;
    const payload = await parseRequestBody(request, updateTicketSchema);
    const ticket = await updateTicket(id, payload, sessionUser);

    revalidatePath("/tickets");
    revalidatePath(`/tickets/${id}`);

    return apiSuccess({ ticket });
  } catch (error) {
    return handleApiError(error);
  }
}
