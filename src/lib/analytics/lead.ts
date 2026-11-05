import { Prisma } from "@prisma/client";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanPath } from "./classify";
import { getSettings } from "./settings";

const ID = /^[A-Za-z0-9_-]{8,40}$/;
const isUnique = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export interface TrackingIds { vid: string | null; sid: string | null }

/** Reads the first-party ids the tracker keeps in cookies, so forms need no change to be attributed. */
export function readTrackingIds(req: Request): TrackingIds {
  const header = req.headers.get("cookie") ?? "";
  const get = (name: string) => {
    const m = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    const v = m ? decodeURIComponent(m[1]) : null;
    return v && ID.test(v) ? v : null;
  };
  return { vid: get("rs_vid"), sid: get("rs_sid") };
}

export interface LeadConversionInput {
  leadId: number;
  contactId?: number | null;
  ids: TrackingIds;
  /** Page the form was submitted from (path only). */
  page?: string | null;
  service?: string | null;
  now?: Date;
}

/**
 * Called ONLY after the existing backend has persisted the lead. Creates exactly one analytics conversion per lead
 * (`lead:<id>` unique key), so retries, duplicate submissions and repeated hook calls can never double count.
 * Never throws into the caller's flow — see safeRecordLeadConversion.
 */
export async function recordLeadConversion(input: LeadConversionInput) {
  const now = input.now ?? new Date();
  const key = `lead:${input.leadId}`;
  const existing = await prisma.analyticsConversion.findUnique({ where: { conversionKey: key } });
  if (existing) return existing;

  const settings = await getSettings();
  const visitor = input.ids.vid ? await prisma.analyticsVisitor.findUnique({ where: { visitorId: input.ids.vid } }) : null;
  let session = input.ids.sid ? await prisma.analyticsSession.findUnique({ where: { sessionId: input.ids.sid } }) : null;
  if (session && visitor && session.visitorRef !== visitor.id) session = null;
  if (!session && visitor) session = await prisma.analyticsSession.findFirst({ where: { visitorRef: visitor.id }, orderBy: { lastActivityAt: "desc" } });

  // Last touch = this session's source unless it was direct, in which case the latest non-direct session inside the attribution window.
  let lt: { channel: string; source: string | null; medium: string | null; campaign: string | null } | null = null;
  if (session) {
    lt = { channel: session.channel, source: session.utmSource ?? session.referrerDomain, medium: session.utmMedium, campaign: session.utmCampaign };
    if (session.channel === "direct" && visitor) {
      const since = new Date(now.getTime() - settings.attributionWindowDays * 86_400_000);
      const prev = await prisma.analyticsSession.findFirst({
        where: { visitorRef: visitor.id, channel: { not: "direct" }, startedAt: { gte: since } },
        orderBy: { startedAt: "desc" },
      });
      if (prev) lt = { channel: prev.channel, source: prev.utmSource ?? prev.referrerDomain, medium: prev.utmMedium, campaign: prev.utmCampaign };
    }
  }

  let row;
  try {
    row = await prisma.analyticsConversion.create({
      data: {
        conversionKey: key, leadId: input.leadId, contactId: input.contactId ?? null,
        visitorRef: visitor?.id ?? null, sessionRef: session?.id ?? null, visitorId: visitor?.visitorId ?? null, sessionId: session?.sessionId ?? null,
        occurredAt: now, landingPage: session?.landingPage ?? null,
        conversionPage: input.page ? cleanPath(input.page) : session?.currentPage ?? null,
        ftChannel: visitor?.ftChannel ?? null, ftSource: visitor?.ftSource ?? null, ftCampaign: visitor?.ftCampaign ?? null,
        ltChannel: lt?.channel ?? null, ltSource: lt?.source ?? null, ltMedium: lt?.medium ?? null, ltCampaign: lt?.campaign ?? null,
        referrer: session?.referrer ?? null, countryCode: session?.countryCode ?? null, device: session?.device ?? null,
        pagesVisited: session?.pageViews ?? 0, previousVisits: Math.max(0, (session?.visitNumber ?? 1) - 1),
        engagedSecondsBefore: session?.engagedSeconds ?? 0, service: input.service?.slice(0, 160) ?? null, attributed: Boolean(session),
      },
    });
  } catch (e) {
    if (isUnique(e)) return prisma.analyticsConversion.findUniqueOrThrow({ where: { conversionKey: key } });
    throw e;
  }

  if (session && visitor) {
    await prisma.analyticsEvent.createMany({
      data: [{ eventId: `lead-${input.leadId}`, sessionRef: session.id, visitorRef: visitor.id, type: "lead_created", path: row.conversionPage, occurredAt: now, props: { leadId: input.leadId } }],
      skipDuplicates: true,
    });
    await prisma.analyticsSession.update({ where: { id: session.id }, data: { converted: true, leadId: input.leadId, eventCount: { increment: 1 } } });
    await prisma.analyticsVisitor.update({ where: { id: visitor.id }, data: { leadCount: { increment: 1 } } });
  }
  return row;
}

/** A server-observed failed submission (validation, anti-spam, persistence). Stores a reason code only — never form contents. */
export async function recordFormFailure(ids: TrackingIds, page: string | null | undefined, reason: string, now = new Date()) {
  if (!ids.vid || !ids.sid) return;
  const visitor = await prisma.analyticsVisitor.findUnique({ where: { visitorId: ids.vid } });
  const session = await prisma.analyticsSession.findUnique({ where: { sessionId: ids.sid } });
  if (!visitor || !session || session.visitorRef !== visitor.id) return;
  await prisma.analyticsEvent.create({
    data: {
      eventId: `ff-${Math.random().toString(36).slice(2, 10)}${now.getTime().toString(36)}`.slice(0, 40), sessionRef: session.id, visitorRef: visitor.id,
      type: "form_submit_failure", path: page ? cleanPath(page) : session.currentPage, occurredAt: now, props: { reason: reason.slice(0, 40) },
    },
  });
}

/** Wraps analytics so a failure can never reach, delay-fail, or alter the enquiry flow. */
export async function safeRecordLeadConversion(input: LeadConversionInput): Promise<void> {
  try {
    await recordLeadConversion(input);
  } catch (err) {
    console.error("[intel] lead attribution failed (lead is saved):", err instanceof Error ? err.name : "unknown");
  }
}

export async function safeRecordFormFailure(ids: TrackingIds, page: string | null | undefined, reason: string): Promise<void> {
  try {
    await recordFormFailure(ids, page, reason);
  } catch {
    /* analytics must never break the form */
  }
}

/** Runs after the response is sent where the platform supports it (Next `after`), otherwise fire-and-forget. Synchronous so it registers inside the request scope. */
export function runAfterResponse(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    void task().catch(() => undefined);
  }
}
