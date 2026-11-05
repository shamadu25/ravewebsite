import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";
import { ORG_ID } from "@/lib/os/constants";
import { getSettings } from "./settings";

/** Rolls expired days into analytics_daily_summaries (idempotent upsert), then deletes raw rows in bounded chunks. Safe to re-run. */
export async function runRetention(now = new Date()) {
  const s = await getSettings();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - s.rawRetentionDays * 86_400_000);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO analytics_daily_summaries (day, channel, country_code, device, sessions, new_visitors, page_views, engaged_seconds, elapsed_seconds, bounces, leads, updated_at)
    SELECT DATE(s.started_at), s.channel, COALESCE(s.country_code,''), s.device, COUNT(*), SUM(s.is_new_visitor), SUM(s.page_views), SUM(s.engaged_seconds), SUM(s.elapsed_seconds),
      SUM(CASE WHEN s.engaged_seconds >= 10 OR s.page_views >= 2 OR s.converted = 1 THEN 0 ELSE 1 END), 0, NOW(3)
    FROM analytics_sessions s WHERE s.started_at < ${cutoff} GROUP BY DATE(s.started_at), s.channel, COALESCE(s.country_code,''), s.device
    ON DUPLICATE KEY UPDATE sessions = VALUES(sessions), new_visitors = VALUES(new_visitors), page_views = VALUES(page_views), engaged_seconds = VALUES(engaged_seconds),
      elapsed_seconds = VALUES(elapsed_seconds), bounces = VALUES(bounces), updated_at = NOW(3)`);
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO analytics_daily_summaries (day, channel, country_code, device, leads, updated_at)
    SELECT DATE(c.occurred_at), COALESCE(c.lt_channel,'direct'), COALESCE(c.country_code,''), COALESCE(c.device,'desktop'), COUNT(*), NOW(3)
    FROM analytics_conversions c WHERE c.occurred_at < ${cutoff} GROUP BY DATE(c.occurred_at), COALESCE(c.lt_channel,'direct'), COALESCE(c.country_code,''), COALESCE(c.device,'desktop')
    ON DUPLICATE KEY UPDATE leads = VALUES(leads), updated_at = NOW(3)`);

  let deleted = 0;
  // Events/pageviews reference sessions with ON DELETE CASCADE, but deleting them first keeps each statement small.
  for (const table of ["analytics_events", "analytics_pageviews"] as const) {
    const col = table === "analytics_events" ? "occurred_at" : "started_at";
    for (let i = 0; i < 40; i++) {
      const n = await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE ${col} < ? LIMIT 5000`, cutoff);
      deleted += n;
      if (n < 5000) break;
    }
  }
  for (let i = 0; i < 40; i++) {
    const n = await prisma.$executeRaw(Prisma.sql`DELETE FROM analytics_sessions WHERE started_at < ${cutoff} LIMIT 5000`);
    deleted += n;
    if (n < 5000) break;
  }
  deleted += await prisma.$executeRaw(Prisma.sql`DELETE v FROM analytics_visitors v LEFT JOIN analytics_sessions s ON s.visitor_ref = v.id WHERE v.last_seen_at < ${cutoff} AND s.id IS NULL`);
  return { cutoff, deleted };
}

/** Data-deletion procedure (e.g. a data-subject request): removes one anonymous visitor's rows. Lead records themselves are untouched. */
export async function deleteVisitorData(visitorId: string, actor: string, ip: string | null = null) {
  const v = await prisma.analyticsVisitor.findUnique({ where: { visitorId } });
  if (!v) return { deleted: false };
  await prisma.$transaction([
    prisma.analyticsConversion.updateMany({ where: { visitorRef: v.id }, data: { visitorRef: null, sessionRef: null, visitorId: null, sessionId: null } }),
    prisma.analyticsVisitor.delete({ where: { id: v.id } }), // cascades sessions, pageviews, events
  ]);
  await audit({ actor, actorType: "HUMAN", action: "analytics.visitor.delete", resource: "analytics_visitor", resourceId: visitorId.slice(0, 8), ip });
  return { deleted: true };
}

/** Raises OsAlert rows (deduplicated per day) from the last 24 h vs the 24 h before. Needs a minimum baseline so quiet days never alarm. */
export async function evaluateAlerts(now = new Date()) {
  const s = await getSettings();
  const h24 = new Date(now.getTime() - 86_400_000), h48 = new Date(now.getTime() - 2 * 86_400_000);
  const day = now.toISOString().slice(0, 10);
  const raised: string[] = [];
  const raise = async (key: string, severity: string, title: string, body: string) => {
    const dedupeKey = `intel:${key}:${day}`;
    const exists = await prisma.osAlert.findUnique({ where: { orgId_dedupeKey: { orgId: ORG_ID, dedupeKey } } });
    if (exists) return;
    await prisma.osAlert.create({ data: { orgId: ORG_ID, severity, category: "analytics", title, body, dedupeKey } });
    raised.push(key);
  };

  const [cur, prev, conv, convPrev] = await Promise.all([
    prisma.analyticsSession.count({ where: { startedAt: { gte: h24 } } }),
    prisma.analyticsSession.count({ where: { startedAt: { gte: h48, lt: h24 } } }),
    prisma.analyticsSession.count({ where: { startedAt: { gte: h24 }, converted: true } }),
    prisma.analyticsSession.count({ where: { startedAt: { gte: h48, lt: h24 }, converted: true } }),
  ]);
  if (prev >= 30) {
    const ch = ((cur - prev) / prev) * 100;
    if (ch <= -s.alertTrafficDropPct) await raise("traffic_drop", "HIGH", "Website traffic dropped", `Sessions fell ${Math.abs(Math.round(ch))}% in the last 24 h (${prev} → ${cur}).`);
    if (ch >= s.alertTrafficSpikePct) await raise("traffic_spike", "INFO", "Website traffic spike", `Sessions rose ${Math.round(ch)}% in the last 24 h (${prev} → ${cur}). Check the source before spending more.`);
    const r1 = prev ? convPrev / prev : 0, r0 = cur ? conv / cur : 0;
    if (convPrev >= 3 && r1 > 0 && ((r0 - r1) / r1) * 100 <= -s.alertConversionDropPct) await raise("conversion_drop", "HIGH", "Conversion rate dropped", `Converting sessions: ${(r1 * 100).toFixed(1)}% → ${(r0 * 100).toFixed(1)}% over the last 24 h.`);
  }
  const [att, fail, errs] = await Promise.all([
    prisma.analyticsEvent.count({ where: { occurredAt: { gte: h24 }, type: "form_submit_attempt" } }),
    prisma.analyticsEvent.count({ where: { occurredAt: { gte: h24 }, type: "form_submit_failure" } }),
    prisma.analyticsEvent.count({ where: { occurredAt: { gte: h24 }, type: "js_error" } }),
  ]);
  if (att >= 10 && (fail / att) * 100 >= s.alertFormFailurePct) await raise("form_failures", "CRITICAL", "High form failure rate", `${fail} of ${att} form submissions failed in the last 24 h. Check /admin/intelligence/technical.`);
  if (errs >= 50) await raise("js_errors", "HIGH", "JavaScript errors rising", `${errs} browser errors recorded in the last 24 h.`);

  const geoNow = await prisma.$queryRaw<Array<{ cc: string; n: unknown }>>(Prisma.sql`SELECT country_code cc, COUNT(*) n FROM analytics_sessions WHERE started_at >= ${h24} AND country_code IS NOT NULL GROUP BY country_code HAVING COUNT(*) >= 25`);
  for (const g of geoNow) {
    const seen = await prisma.analyticsSession.count({ where: { countryCode: g.cc, startedAt: { gte: new Date(now.getTime() - 30 * 86_400_000), lt: h24 } } });
    if (seen === 0) await raise(`geo_${g.cc}`, "INFO", `Unusual traffic from ${g.cc}`, `${Number(g.n)} sessions from ${g.cc} in 24 h with none in the previous 30 days. Could be a campaign, or bot traffic.`);
  }
  return { raised };
}
