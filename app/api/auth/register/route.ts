import { createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/auth/schemas";
import { registerUser } from "@/lib/auth/service";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// 5 registrations per hour per IP
const REGISTER_RATE_LIMIT = { max: 5, windowSeconds: 3600 };

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`register:${ip}`, REGISTER_RATE_LIMIT);

    if (!limit.allowed) {
      return apiError("Too many registration attempts. Please try again later.", {
        status: 429,
        code: "RATE_LIMITED",
      });
    }

    const body = await parseRequestBody(request, registerSchema);
    const user = await registerUser(body);

    await createSession(user.id);

    return apiSuccess({ user }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
