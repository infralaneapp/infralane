import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { updateTicketStatus } from "@/modules/tickets/service";
import { updateTicketStatusSchema } from "@/modules/tickets/schemas";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
    const payload = await parseRequestBody(request, updateTicketStatusSchema);
    const ticket = await updateTicketStatus(id, payload, sessionUser);

    revalidatePath("/tickets");
    revalidatePath(`/tickets/${id}`);

    return apiSuccess({ ticket });
  } catch (error) {
    return handleApiError(error);
  }
}
