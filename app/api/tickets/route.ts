import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { createTicket, listTickets } from "@/modules/tickets/service";
import { createTicketSchema, listTicketsFilterSchema } from "@/modules/tickets/schemas";

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return apiError("Authentication required.", {
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const url = new URL(request.url);
    const filters = listTicketsFilterSchema.parse(Object.fromEntries(url.searchParams.entries()));
    const tickets = await listTickets(filters, sessionUser);

    return apiSuccess({ tickets });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return apiError("Authentication required.", {
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const payload = await parseRequestBody(request, createTicketSchema);
    const ticket = await createTicket(payload, sessionUser.id);

    revalidatePath("/tickets");
    revalidatePath(`/tickets/${ticket.id}`);

    return apiSuccess({ ticket }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
