const store = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * In-memory rate limiter.
 *
 * FAIL-CLOSED: if `failOpen` is false (default), the limiter rejects requests
 * when the backing store is unavailable (e.g. after a process restart the map
 * is empty — that's fine for in-memory, but the flag is here for when we
 * migrate to Redis so the behaviour is explicit).
 *
 * A Redis-backed implementation can be swapped in by replacing this function.
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60_000 },
  { failOpen = false }: { failOpen?: boolean } = {}
): { success: boolean; remaining: number } {
  try {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + config.windowMs });
      return { success: true, remaining: config.maxRequests - 1 };
    }

    entry.count++;
    const remaining = Math.max(0, config.maxRequests - entry.count);

    if (entry.count > config.maxRequests) {
      return { success: false, remaining: 0 };
    }

    return { success: true, remaining };
  } catch {
    // Fail closed by default — reject the request when the rate limiter errors
    if (failOpen) {
      return { success: true, remaining: 0 };
    }
    return { success: false, remaining: 0 };
  }
}
