import { clearSession } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/http";

export async function POST() {
  try {
    await clearSession();
    return apiSuccess({ loggedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}
