import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ai/rateLimit";

/**
 * Rate limit that holds across ALL serverless instances (Vercel runs many, each with its own memory, so a
 * purely in-memory counter lets a bot dodge limits by landing on different instances).
 *
 * Layer 1 – in-memory: cheap, absorbs bursts on this instance without touching the database.
 * Layer 2 – shared counter in the existing `system_settings` table (no migration): one atomic
 *           INSERT … ON DUPLICATE KEY UPDATE per fixed time window, keyed `rl:<window>:<key>`.
 * If the database is unreachable it fails OPEN to the in-memory answer — never blocks real customers.
 * Only used on the low-volume public forms, so the extra writes are negligible.
 */
const PREFIX = "rl:";

function rowKey(key: string, bucket: number): string {
  const safe = key.length > 100 ? createHash("sha1").update(key).digest("hex") : key;
  return `${PREFIX}${bucket}:${safe}`.slice(0, 190);
}

export async function sharedRateLimit(key: string, max: number, windowMs: number, now = Date.now()): Promise<boolean> {
  if (rateLimit(key, max, windowMs, now)) return true;
  try {
    const k = rowKey(key, Math.floor(now / windowMs));
    await prisma.$executeRaw`
      INSERT INTO system_settings (\`key\`, value, created_at, updated_at)
      VALUES (${k}, JSON_OBJECT('n', 1), NOW(3), NOW(3))
      ON DUPLICATE KEY UPDATE value = JSON_SET(value, '$.n', JSON_EXTRACT(value, '$.n') + 1), updated_at = NOW(3)`;
    const rows = await prisma.$queryRaw<{ n: bigint | number | string }[]>`
      SELECT CAST(JSON_UNQUOTE(JSON_EXTRACT(value, '$.n')) AS UNSIGNED) AS n FROM system_settings WHERE \`key\` = ${k}`;
    const n = Number(rows[0]?.n ?? 1);
    if (Math.random() < 0.02) void prune();
    return n > max;
  } catch (error) {
    console.error("[antispam] shared rate limit unavailable, using in-memory result", error);
    return false;
  }
}

/** Housekeeping: drop counters older than a few hours. */
async function prune(): Promise<void> {
  try {
    await prisma.$executeRaw`DELETE FROM system_settings WHERE \`key\` LIKE 'rl:%' AND updated_at < (NOW(3) - INTERVAL 3 HOUR) LIMIT 500`;
  } catch {
    // best effort
  }
}
