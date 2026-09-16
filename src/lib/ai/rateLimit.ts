/**
 * Best-effort in-memory rate limiter (spec §67). Not perfectly distributed
 * across serverless instances/cold starts, but bounds abuse from a single
 * warm instance without needing external infrastructure.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

const hits = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}
