export type TicketSnapshot = {
  priority: string;
  status: string;
  assigneeId: string | null;
  ticketType: { key: string };
  tags: Array<{ tag: { name: string } }>;
  fields: Array<{ key: string; value: string }>;
};

/**
 * Evaluate automation rule conditions against a ticket snapshot.
 * All conditions must match (AND logic). Empty conditions = always match.
 */
export function evaluateConditions(
  conditions: Record<string, string>,
  ticket: TicketSnapshot
): boolean {
  const entries = Object.entries(conditions);
  if (entries.length === 0) return true;

  for (const [key, expected] of entries) {
    switch (key) {
      case "ticketType":
        if (ticket.ticketType.key !== expected) return false;
        break;

      case "priority":
        if (ticket.priority !== expected) return false;
        break;

      case "status":
        if (ticket.status !== expected) return false;
        break;

      case "assigneeId":
        if (expected === "null") {
          if (ticket.assigneeId !== null) return false;
        } else if (expected === "any") {
          if (ticket.assigneeId === null) return false;
        } else {
          if (ticket.assigneeId !== expected) return false;
        }
        break;

      case "tag": {
        const hasTag = ticket.tags.some(
          (t) => t.tag.name.toLowerCase() === expected.toLowerCase()
        );
        if (!hasTag) return false;
        break;
      }

      default: {
        // Match against structured field values
        const field = ticket.fields.find((f) => f.key === key);
        if (!field || field.value !== expected) return false;
        break;
      }
    }
  }

  return true;
}
