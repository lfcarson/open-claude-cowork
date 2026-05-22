// In-process sliding-window rate limiter.
// For multi-instance deployments, replace with Redis (ioredis + sliding-window script).

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  existing.count += 1;
  const ok = existing.count <= maxRequests;
  return { ok, remaining: Math.max(0, maxRequests - existing.count), resetAt: existing.resetAt };
}

// Periodically clean up expired windows to avoid memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of store.entries()) {
      if (now >= win.resetAt) store.delete(key);
    }
  }, 60_000);
}
