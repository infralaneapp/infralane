import { prisma } from "@/lib/db";

export type SlaThreshold = { responseHours: number; resolutionHours: number };

/** Default SLA thresholds — used as fallback when no DB config exists */
export const DEFAULT_SLA_THRESHOLDS: Record<string, SlaThreshold> = {
  URGENT: { responseHours: 1, resolutionHours: 4 },
  HIGH: { responseHours: 4, resolutionHours: 24 },
  MEDIUM: { responseHours: 8, resolutionHours: 72 },
  LOW: { responseHours: 24, resolutionHours: 168 },
};

// In-memory cache to avoid querying DB on every SLA check
let cachedThresholds: Record<string, SlaThreshold> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get SLA thresholds — from DB if configured, otherwise defaults.
 * Cached for 1 minute to avoid excessive DB queries.
 */
export async function getSlaThresholds(): Promise<Record<string, SlaThreshold>> {
  if (cachedThresholds && Date.now() - cacheTime < CACHE_TTL) {
    return cachedThresholds;
  }

  try {
    const config = await prisma.integrationConfig.findUnique({
      where: { provider: "sla_thresholds" },
    });

    if (config?.config && typeof config.config === "object") {
      cachedThresholds = config.config as Record<string, SlaThreshold>;
    } else {
      cachedThresholds = DEFAULT_SLA_THRESHOLDS;
    }
  } catch {
    cachedThresholds = DEFAULT_SLA_THRESHOLDS;
  }

  cacheTime = Date.now();
  return cachedThresholds;
}

/** Synchronous version using defaults — for client-side use */
export const SLA_THRESHOLDS = DEFAULT_SLA_THRESHOLDS;

/** Invalidate the cache — call after saving new thresholds */
export function invalidateSlaCache() {
  cachedThresholds = null;
  cacheTime = 0;
}

/**
 * Calculate remaining SLA time in milliseconds.
 * Returns null if the SLA has already been met.
 * Returns negative value if the SLA is breached.
 */
export function getSlaRemaining(
  priority: string,
  createdAt: string,
  type: "response" | "resolution",
  firstResponseAt?: string | null,
  resolvedAt?: string | null,
  thresholds?: Record<string, SlaThreshold>,
): number | null {
  if (type === "response" && firstResponseAt) return null;
  if (type === "resolution" && resolvedAt) return null;

  const t = (thresholds ?? DEFAULT_SLA_THRESHOLDS)[priority];
  if (!t) return null;

  const thresholdMs =
    (type === "response" ? t.responseHours : t.resolutionHours) * 60 * 60 * 1000;

  const elapsed = Date.now() - new Date(createdAt).getTime();
  return thresholdMs - elapsed;
}

/**
 * Format milliseconds into a human-readable countdown string.
 */
export function formatSlaCountdown(remainingMs: number): string {
  const absMs = Math.abs(remainingMs);
  const totalMinutes = Math.floor(absMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let timeStr: string;
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    timeStr = `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    timeStr = `${hours}h ${minutes}m`;
  } else {
    timeStr = `${minutes}m`;
  }

  if (remainingMs < 0) {
    return `Breached ${timeStr} ago`;
  }
  return `${timeStr} remaining`;
}
