/**
 * Fixed-window rate limiter: at most `limit` attempts per key per window.
 * In memory, so it resets when the server restarts, which is fine for one
 * dev server. A multi-server deployment would keep counts in a shared store.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const windows = new Map<string, { start: number; count: number }>()

  function allow(key: string, nowMs = Date.now()): boolean {
    // Forget windows that have ended, so memory can't grow with every new IP.
    for (const [k, w] of windows) if (nowMs - w.start >= windowMs) windows.delete(k)

    const window = windows.get(key)
    if (!window) {
      windows.set(key, { start: nowMs, count: 1 })
      return true
    }
    window.count += 1
    return window.count <= limit
  }

  /** How many keys are being tracked (for tests). */
  allow.size = () => windows.size
  return allow
}
