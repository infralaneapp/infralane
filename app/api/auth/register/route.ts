import { createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/auth/schemas";
import { registerUser } from "@/lib/auth/service";
import { apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, registerSchema);
    const user = await registerUser(body);

    await createSession(user.id);

    return apiSuccess({ user }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
