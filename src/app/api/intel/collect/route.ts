import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin, readJsonLimited } from "@/lib/antispam/request";
import { rateLimit } from "@/lib/ai/rateLimit";
import { clientIp } from "@/app/api/ai/_shared";
import { CollectSchema } from "@/lib/analytics/schema";
import { geoFromHeaders, isBotUserAgent } from "@/lib/analytics/classify";
import { ingest } from "@/lib/analytics/collect";
import { getSettings } from "@/lib/analytics/settings";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export const maxDuration = 10;

/**
 * Public, write-only collector. The browser fires and forgets, so it never reveals internals.
 * Defences: same-origin check, 16 KB cap, strict schema, bot UA filter, per-IP + per-visitor rate limits
 * (in-memory per instance — see docs/intelligence.md), admin-session exclusion, settings kill switch.
 * The visitor's IP is used only transiently for the rate-limit key and is never stored.
 */
export async function POST(req: NextRequest) {
  const quiet = () => new NextResponse(null, { status: 204 });
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    const read = await readJsonLimited(req, 16 * 1024);
    if (!read.ok) return NextResponse.json({ error: "Invalid payload." }, { status: read.status });
    const parsed = CollectSchema.safeParse(read.body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 422 });
    const payload = parsed.data;

    const ua = req.headers.get("user-agent");
    if (isBotUserAgent(ua)) return quiet();

    const ip = clientIp(req);
    if (rateLimit(`intel:ip:${ip}`, 120, 60_000) || rateLimit(`intel:vid:${payload.vid}`, 60, 60_000)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    // Internal staff exclusion: a signed-in administrator's own browsing is never recorded.
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (token && (await verifySessionToken(token).catch(() => null))) return quiet();

    const settings = await getSettings();
    if (!settings.enabled) return quiet();
    if (settings.consentMode === "opt_in" && payload.consent !== true) return quiet();

    const geo = geoFromHeaders((n) => req.headers.get(n), payload.ctx?.tz);
    const hosts = [req.headers.get("x-forwarded-host"), req.headers.get("host")];
    try {
      if (process.env.NEXT_PUBLIC_APP_URL) hosts.push(new URL(process.env.NEXT_PUBLIC_APP_URL).host);
    } catch { /* ignore malformed env */ }
    const ownHosts = hosts.filter((h): h is string => Boolean(h)).map((h) => h.toLowerCase().replace(/^www\./, ""));

    const result = await ingest(payload, { userAgent: ua, geo, ownHosts, excludedPaths: settings.excludedPaths });
    return NextResponse.json({ ok: true, sid: result.sid }, { status: 200 });
  } catch (err) {
    console.error("[intel.collect]", err instanceof Error ? err.message : "error");
    return NextResponse.json({ ok: false }, { status: 202 }); // analytics errors never surface to visitors
  }
}
