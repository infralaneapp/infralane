const clients = new Map<string, Set<ReadableStreamDefaultController>>();

export function addSSEClient(userId: string, controller: ReadableStreamDefaultController) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(controller);
}

export function removeSSEClient(userId: string, controller: ReadableStreamDefaultController) {
  clients.get(userId)?.delete(controller);
  if (clients.get(userId)?.size === 0) clients.delete(userId);
}

export function broadcastToUser(userId: string, event: string, data: unknown) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  for (const controller of userClients) {
    try {
      controller.enqueue(encoder.encode(message));
    } catch {
      userClients.delete(controller);
    }
  }
}

export function broadcastToAll(event: string, data: unknown) {
  for (const userId of clients.keys()) {
    broadcastToUser(userId, event, data);
  }
}
