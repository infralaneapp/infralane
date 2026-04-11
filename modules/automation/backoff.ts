/**
 * Compute the next retry time using exponential backoff with jitter.
 *
 * Formula: min(baseDelayMs * 2^attempts + jitter, maxDelayMs)
 * Jitter: random 0-1000ms to prevent thundering herd.
 */
export function computeNextRunAt(
  attempts: number,
  baseDelayMs = 5000,
  maxDelayMs = 300000
): Date {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempts);
  const jitter = Math.floor(Math.random() * 1000);
  const delay = Math.min(exponentialDelay + jitter, maxDelayMs);

  return new Date(Date.now() + delay);
}
