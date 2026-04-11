/**
 * Simple in-memory rate limiter.
 * Not suitable for multi-instance deployments — use Redis-backed limiter in production.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  rateLimitCleanup?: ReturnType<typeof setInterval>;
  rateLimitStore?: Map<string, RateLimitEntry>;
};

if (globalForRateLimit.rateLimitCleanup) {
  clearInterval(globalForRateLimit.rateLimitCleanup);
}

const store = globalForRateLimit.rateLimitStore ??= new Map<string, RateLimitEntry>();

globalForRateLimit.rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 60000);

export type RateLimitConfig = {
  /** Maximum requests allowed in the window */
  max: number;
  /** Window duration in seconds */
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Check if a request is within rate limits.
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowSeconds * 1000 };
  }

  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Get client IP from request headers (works behind proxies).
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
