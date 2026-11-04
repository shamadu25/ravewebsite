/**
 * Best-effort in-memory rate limiter (spec §67). Not perfectly distributed across serverless
 * instances/cold starts, but bounds abuse from a single warm instance without external infrastructure.
 * Entries are pruned so a flood of unique keys cannot grow memory without limit.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const MAX_KEYS = 50_000;

const hits = new Map<string, { count: number; resetAt: number }>();
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < 30_000 && hits.size < MAX_KEYS) return;
  lastSweep = now;
  for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
  // Still too large after dropping expired keys (sustained unique-key flood): drop the oldest half.
  if (hits.size >= MAX_KEYS) {
    let i = 0;
    for (const k of hits.keys()) {
      if (i++ > MAX_KEYS / 2) break;
      hits.delete(k);
    }
  }
}

/** Counts one hit for `key` and returns true when it is over `max` within `windowMs`. */
export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  sweep(now);
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return max < 1;
  }
  entry.count += 1;
  return entry.count > max;
}

/** Default policy: 20 requests per minute. */
export function isRateLimited(key: string): boolean {
  return rateLimit(key, MAX_REQUESTS, WINDOW_MS);
}
