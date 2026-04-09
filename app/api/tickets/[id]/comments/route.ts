import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { addTicketComment } from "@/modules/comments/service";
import { createCommentSchema } from "@/modules/comments/schemas";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return apiError("Authentication required.", {
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const { id } = await context.params;
    const payload = await parseRequestBody(request, createCommentSchema);
    const comment = await addTicketComment(id, payload, sessionUser);

    revalidatePath(`/tickets/${id}`);

    return apiSuccess({ comment }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
