import { getSessionUser } from "@/lib/auth";
import { addSSEClient } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = user.id;

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(userId, controller);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      controller.enqueue(new TextEncoder().encode(`event: connected\ndata: {"userId":"${userId}"}\n\n`));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
