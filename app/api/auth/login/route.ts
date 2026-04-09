import { authenticateUser, createSession, loginSchema } from "@/lib/auth";
import { apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, loginSchema);
    const user = await authenticateUser(body);

    await createSession(user.id);

    return apiSuccess({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
