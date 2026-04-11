import { authenticateUser, createSession, loginSchema } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// 10 login attempts per minute per IP
const LOGIN_RATE_LIMIT = { max: 10, windowSeconds: 60 };

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT);

    if (!limit.allowed) {
      return apiError("Too many login attempts. Please try again later.", {
        status: 429,
        code: "RATE_LIMITED",
      });
    }

    const body = await parseRequestBody(request, loginSchema);
    const user = await authenticateUser(body);

    await createSession(user.id);

    return apiSuccess({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
