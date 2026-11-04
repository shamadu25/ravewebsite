import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Signed, short-lived form tokens. A real browser loads the page, fetches a token, and submits it
 * seconds later; a bot that POSTs straight to the API has no valid token or submits instantly.
 * Format: `<issuedAtMs>.<nonce>.<hmac>`. Stateless apart from a small per-process reuse counter.
 */
const MAX_AGE_MS = 2 * 60 * 60_000;
const MAX_USES = 5;
const uses = new Map<string, { n: number; exp: number }>();

let ephemeralSecret: string | null = null;
function secret(): string {
  const s = process.env.FORM_TOKEN_SECRET ?? process.env.ADMIN_SESSION_SECRET ?? process.env.OS_UNSUBSCRIBE_SECRET;
  if (s) return s;
  // No secret configured: still protects a single long-lived process, and fails closed across restarts.
  return (ephemeralSecret ??= randomBytes(32).toString("hex"));
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("hex");

export function issueFormToken(now = Date.now()): string {
  const payload = `${now}.${randomBytes(8).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}

export type TokenCheck = { ok: true } | { ok: false; reason: "missing" | "invalid" | "too_fast" | "expired" | "reused" };

export function verifyFormToken(token: string | null | undefined, minAgeMs: number, now = Date.now()): TokenCheck {
  if (!token) return { ok: false, reason: "missing" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "invalid" };
  const [issued, nonce, mac] = parts;
  const expected = sign(`${issued}.${nonce}`);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "invalid" };

  const age = now - Number(issued);
  if (!Number.isFinite(age) || age < 0) return { ok: false, reason: "invalid" };
  if (age < minAgeMs) return { ok: false, reason: "too_fast" };
  if (age > MAX_AGE_MS) return { ok: false, reason: "expired" };

  // Limit how many submissions one token can authorise (bots replaying a single harvested token).
  for (const [k, v] of uses) if (now > v.exp) uses.delete(k);
  const u = uses.get(nonce) ?? { n: 0, exp: Number(issued) + MAX_AGE_MS };
  u.n += 1;
  uses.set(nonce, u);
  if (u.n > MAX_USES) return { ok: false, reason: "reused" };
  return { ok: true };
}
