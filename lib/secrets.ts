/**
 * Mask a secret value, showing only the last 4 characters.
 * Returns empty string if value is falsy.
 */
export function maskSecret(value: unknown): string {
  if (!value || typeof value !== "string") return "";
  if (value.length <= 4) return "****";
  return "****" + value.slice(-4);
}

/** Keys that should be masked in integration config objects */
const SENSITIVE_KEYS = new Set([
  "botToken",
  "signingSecret",
  "clientSecret",
  "secretKey",
  "password",
  "apiKey",
  "token",
]);

/**
 * Mask sensitive fields in a config object.
 * Returns a shallow copy with sensitive values replaced.
 */
export function maskConfigSecrets(config: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (SENSITIVE_KEYS.has(key) && typeof value === "string") {
      masked[key] = maskSecret(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

/**
 * Mask sensitive header values (Authorization, X-Api-Key, etc.)
 */
export function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  const sensitiveHeaders = new Set(["authorization", "x-api-key", "x-secret", "cookie"]);
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.has(key.toLowerCase())) {
      masked[key] = maskSecret(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}
