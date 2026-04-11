import { createHash } from "node:crypto";

/**
 * Produces a stable, deterministic dedup key from rule + ticket + trigger + context.
 * Used to prevent duplicate job creation for identical trigger emissions.
 * Two concurrent emissions with identical inputs produce the same key.
 */
export function computeDedupKey(
  ruleId: string,
  ticketId: string,
  trigger: string,
  context?: Record<string, unknown>
): string {
  const normalized = {
    ruleId,
    ticketId,
    trigger,
    context: context ? sortKeys(context) : {},
  };

  return createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex")
    .slice(0, 32); // 32 hex chars = 128 bits, sufficient for dedup
}

function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}
