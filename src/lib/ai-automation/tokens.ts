/** Signed, expiring, opaque tokens for customer proposal links and opt-outs. No personal data in URLs. */
import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  const s = process.env.AI_AUTOMATION_LINK_SECRET || process.env.OS_UNSUBSCRIBE_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("AI_AUTOMATION_LINK_SECRET (or ADMIN_SESSION_SECRET) is not configured.");
  return s;
}
const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export type TokenKind = "proposal" | "optout";
export interface TokenPayload { k: TokenKind; id: number; exp: number }

export function signToken(kind: TokenKind, id: number, ttlDays: number, now = Date.now()): string {
  const payload = b64(JSON.stringify({ k: kind, id, exp: Math.floor(now / 1000) + Math.round(ttlDays * 86400) } satisfies TokenPayload));
  const sig = b64(createHmac("sha256", secret()).update(`${kind}.${payload}`).digest());
  return `${payload}.${sig}`;
}

export function verifyToken(token: string | undefined | null, kind: TokenKind, now = Date.now()): TokenPayload | null {
  if (!token || token.length > 400) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = b64(createHmac("sha256", secret()).update(`${kind}.${payload}`).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as TokenPayload;
    if (p.k !== kind || typeof p.id !== "number" || typeof p.exp !== "number" || p.exp * 1000 < now) return null;
    return p;
  } catch { return null; }
}
