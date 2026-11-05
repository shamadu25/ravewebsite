import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  campaignParams, type CollectEvent, type CollectPayload, EVENT_TYPES, MAX_HEARTBEAT_SECONDS, SERVER_ONLY_EVENTS, SESSION_TIMEOUT_MS, cleanProps,
} from "./schema";
import {
  classifyChannel, cleanPath, intentEventForPath, landingWithCampaign, parseUserAgent, pickClickId, referrerDomain, stripReferrer, type Geo,
} from "./classify";
import { randomBytes } from "crypto";

export interface RequestMeta {
  userAgent: string | null;
  geo: Geo;
  ownHosts: string[];
  excludedPaths: string[];
  now?: Date;
}

export interface IngestResult {
  /** Session id the browser must use from now on (differs from the one sent when the old session had expired). */
  sid: string;
  accepted: number;
  duplicates: number;
  newSession: boolean;
}

const KNOWN = new Set<string>(EVENT_TYPES);
const SCROLL_STEPS = new Set([25, 50, 75, 90, 100]);
const isUnique = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
const newId = () => randomBytes(12).toString("base64url");

/** Validates the event type; unknown types are allowed only as `custom_*`. */
export function allowedType(type: string): boolean {
  if (SERVER_ONLY_EVENTS.has(type)) return false;
  return KNOWN.has(type) || (type.startsWith("custom_") && type.length > 7);
}

function clientTime(ev: CollectEvent, now: Date): Date {
  if (typeof ev.t !== "number") return now;
  // Trust the client clock only within a sane window; otherwise fall back to the server clock.
  const t = ev.t;
  return t > now.getTime() - 3_600_000 && t <= now.getTime() + 5_000 ? new Date(t) : now;
}

export async function ingest(payload: CollectPayload, meta: RequestMeta): Promise<IngestResult> {
  const now = meta.now ?? new Date();
  const ctx = payload.ctx;
  const params = campaignParams(ctx?.qs);
  const firstPath = cleanPath(ctx?.path ?? payload.events.find((e) => e.path)?.path ?? "/");

  // ── visitor ───────────────────────────────────────────────────────────────────────────────────
  let visitor = await prisma.analyticsVisitor.findUnique({ where: { visitorId: payload.vid } });

  // ── session ───────────────────────────────────────────────────────────────────────────────────
  let session = await prisma.analyticsSession.findUnique({ where: { sessionId: payload.sid } });
  let sid = payload.sid;
  let newSession = false;
  if (session && (session.visitorRef !== visitor?.id || now.getTime() - session.lastActivityAt.getTime() > SESSION_TIMEOUT_MS)) {
    // Resumed after the inactivity timeout (or an id collision with another visitor): this is a NEW session.
    session = null;
    sid = newId();
  }

  if (!session) {
    const ua = parseUserAgent(meta.userAgent);
    const click = pickClickId(params);
    const ref = stripReferrer(ctx?.referrer);
    const refDomain = referrerDomain(ctx?.referrer);
    const touch = {
      utmSource: params.utm_source ?? null, utmMedium: params.utm_medium ?? null, utmCampaign: params.utm_campaign ?? null,
      clickIdType: click?.type ?? null, referrerDomain: refDomain, ownHosts: meta.ownHosts,
    };
    const channel = classifyChannel(touch);
    const landing = landingWithCampaign(firstPath, params);
    const startedAt = clientTime(payload.events[0], now);

    if (!visitor) {
      try {
        visitor = await prisma.analyticsVisitor.create({
          data: {
            visitorId: payload.vid, firstSeenAt: startedAt, lastSeenAt: now, sessionCount: 0,
            ftChannel: channel, ftSource: touch.utmSource ?? refDomain, ftMedium: touch.utmMedium, ftCampaign: touch.utmCampaign,
            ftLandingPage: landing, ftReferrerDomain: refDomain, countryCode: meta.geo.countryCode, device: ua.device,
          },
        });
      } catch (e) {
        if (!isUnique(e)) throw e;
        visitor = await prisma.analyticsVisitor.findUniqueOrThrow({ where: { visitorId: payload.vid } });
      }
    }
    const bumped = await prisma.analyticsVisitor.update({ where: { id: visitor.id }, data: { sessionCount: { increment: 1 }, lastSeenAt: now } });
    visitor = bumped;
    const visitNumber = bumped.sessionCount;

    try {
      session = await prisma.analyticsSession.create({
        data: {
          sessionId: sid, visitorRef: visitor.id, startedAt, lastActivityAt: now, visitNumber, isNewVisitor: visitNumber === 1,
          landingPage: landing, currentPage: firstPath, currentTitle: ctx?.title ?? null, referrer: ref, referrerDomain: refDomain,
          channel, utmSource: touch.utmSource, utmMedium: touch.utmMedium, utmCampaign: touch.utmCampaign,
          utmContent: params.utm_content ?? null, utmTerm: params.utm_term ?? null, clickIdType: click?.type ?? null, clickId: click?.id ?? null,
          device: ua.device, browser: ua.browser, browserVersion: ua.browserVersion, os: ua.os,
          screen: ctx?.screen ?? null, viewport: ctx?.viewport ?? null, language: ctx?.lang ?? null, timezone: ctx?.tz ?? null,
          country: meta.geo.country, countryCode: meta.geo.countryCode, region: meta.geo.region, city: meta.geo.city,
          continent: meta.geo.continent, geoSource: meta.geo.geoSource,
        },
      });
      newSession = true;
    } catch (e) {
      if (!isUnique(e)) throw e;
      session = await prisma.analyticsSession.findUniqueOrThrow({ where: { sessionId: sid } });
    }
  } else if (visitor) {
    await prisma.analyticsVisitor.update({ where: { id: visitor.id }, data: { lastSeenAt: now } });
  }
  if (!visitor || !session) throw new Error("analytics: visitor/session unavailable");

  // ── events ────────────────────────────────────────────────────────────────────────────────────
  let accepted = 0;
  let duplicates = 0;
  let addPageViews = 0;
  let addEvents = 0;
  let addEngaged = 0;
  let maxScroll = session.maxScroll;
  let currentPage: string | undefined;
  let currentTitle: string | undefined;
  let exitPage: string | undefined;

  const ordered = [...payload.events].sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  for (const ev of ordered) {
    if (!allowedType(ev.type)) continue;
    const path = cleanPath(ev.path ?? ctx?.path ?? firstPath);
    if (meta.excludedPaths.some((p) => path === p || path.startsWith(`${p}/`))) continue;
    const props = cleanProps(ev.props);
    const at = clientTime(ev, now);

    // Heartbeats and page exits are state updates keyed by pageview: cumulative values make a retried beacon harmless.
    if (ev.type === "engagement_heartbeat" || ev.type === "page_exit") {
      const pvId = ev.pv;
      if (!pvId) continue;
      const pv = await prisma.analyticsPageview.findUnique({ where: { pageviewId: pvId } });
      if (!pv || pv.sessionRef !== session.id) continue;
      const serverElapsed = Math.max(0, Math.floor((now.getTime() - pv.startedAt.getTime()) / 1000));
      const rawEng = Number(props?.eng ?? 0), rawEl = Number(props?.el ?? 0), rawSc = Number(props?.scroll ?? 0);
      const el = Math.min(Math.max(pv.elapsedSeconds, Math.floor(rawEl) || 0), serverElapsed + 5);
      // Engagement can never exceed elapsed time, and can grow by at most MAX_HEARTBEAT_SECONDS per second-of-gap since the last update.
      const eng = Math.min(Math.max(pv.engagedSeconds, Math.floor(rawEng) || 0), el, pv.engagedSeconds + MAX_HEARTBEAT_SECONDS * 4);
      const scroll = Math.min(100, Math.max(pv.maxScroll, SCROLL_STEPS.has(rawSc) ? rawSc : pv.maxScroll));
      if (eng !== pv.engagedSeconds || el !== pv.elapsedSeconds || scroll !== pv.maxScroll || ev.type === "page_exit") {
        await prisma.analyticsPageview.update({
          where: { id: pv.id },
          data: { engagedSeconds: eng, elapsedSeconds: el, maxScroll: scroll, ...(ev.type === "page_exit" ? { isExit: true } : {}) },
        });
        addEngaged += eng - pv.engagedSeconds;
        maxScroll = Math.max(maxScroll, scroll);
      }
      if (ev.type === "page_exit") exitPage = pv.path;
      accepted++;
      continue;
    }

    try {
      await prisma.analyticsEvent.create({
        data: { eventId: ev.id, sessionRef: session.id, visitorRef: visitor.id, type: ev.type, path, occurredAt: at, props: props as Prisma.InputJsonValue | undefined },
      });
    } catch (e) {
      if (isUnique(e)) { duplicates++; continue; }
      throw e;
    }
    accepted++;
    addEvents++;

    if (ev.type === "page_view") {
      try {
        await prisma.analyticsPageview.create({
          data: { pageviewId: ev.pv ?? ev.id, sessionRef: session.id, visitorRef: visitor.id, path, title: ctx?.title ?? (props?.title as string | undefined) ?? null, startedAt: at },
        });
        addPageViews++;
      } catch (e) {
        if (!isUnique(e)) throw e;
      }
      currentPage = path;
      currentTitle = typeof props?.title === "string" ? props.title : ctx?.title;
      const intent = intentEventForPath(path);
      if (intent) {
        await prisma.analyticsEvent.createMany({
          data: [{ eventId: `${ev.id}-i`.slice(0, 40), sessionRef: session.id, visitorRef: visitor.id, type: intent, path, occurredAt: at }],
          skipDuplicates: true,
        });
        addEvents++;
      }
    } else if (ev.type === "scroll" && SCROLL_STEPS.has(Number(props?.depth))) {
      maxScroll = Math.max(maxScroll, Number(props?.depth));
      if (ev.pv) {
        await prisma.analyticsPageview.updateMany({ where: { pageviewId: ev.pv, sessionRef: session.id, maxScroll: { lt: Number(props?.depth) } }, data: { maxScroll: Number(props?.depth) } });
      }
    }
  }

  const elapsed = Math.max(session.elapsedSeconds, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000));
  await prisma.analyticsSession.update({
    where: { id: session.id },
    data: {
      lastActivityAt: now,
      elapsedSeconds: elapsed,
      maxScroll,
      ...(addPageViews ? { pageViews: { increment: addPageViews } } : {}),
      ...(addEvents ? { eventCount: { increment: addEvents } } : {}),
      ...(addEngaged > 0 ? { engagedSeconds: { increment: addEngaged } } : {}),
      ...(currentPage ? { currentPage, exitPage: currentPage, currentTitle: currentTitle ?? null } : {}),
      ...(exitPage ? { exitPage } : {}),
    },
  });

  return { sid, accepted, duplicates, newSession };
}
