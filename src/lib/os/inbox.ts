import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";
import { audit } from "./audit";
import { handleInboundReply } from "./inbound";
import { logActivity } from "./crm";
import { bouncedRecipient, classifyEmail, extractReplyText, normaliseMessageId } from "./email-utils";

const LAST_POLL_KEY = `os:${ORG_ID}:inbox_last_poll`;
const MAX_SCAN = 400;

export function imapConfig() {
  const host = process.env.IMAP_HOST ?? process.env.SMTP_HOST;
  const user = process.env.IMAP_USER ?? process.env.SMTP_USER;
  const pass = process.env.IMAP_PASS ?? process.env.SMTP_PASS;
  return host && user && pass ? { host, user, pass, port: Number(process.env.IMAP_PORT ?? 993), secure: process.env.IMAP_SECURE !== "false" } : null;
}

export interface EmailOutcome { action: "REPLY" | "OPT_OUT" | "BOUNCE" | "AUTO_REPLY"; oppId: number | null; snippet: string }

/** Decides and performs what a received email means. Pure of IMAP, so it is directly testable. Returns null if it should be ignored. */
export async function actOnEmail(e: { kind: "NORMAL" | "AUTO_REPLY" | "BOUNCE"; from: string; subject: string; text: string; oppId: number | null; byEmail: Map<string, number>; known: Set<string> }): Promise<EmailOutcome | null> {
  const actor = { actor: "inbox", actorType: "WEBHOOK" as const };
  if (e.kind === "BOUNCE") {
    const addr = bouncedRecipient(e.text, e.known);
    if (!addr) return null;
    const oppId = e.byEmail.get(addr) ?? null;
    await prisma.osOptOut.upsert({ where: { orgId_channel_address: { orgId: ORG_ID, channel: "EMAIL", address: addr } }, create: { orgId: ORG_ID, channel: "EMAIL", address: addr, reason: "hard bounce" }, update: {} });
    if (oppId) {
      await logActivity(oppId, actor, "BOUNCE", `Email to ${addr} bounced; address blocked. Find another contact.`, "EMAIL");
      await prisma.osOpportunity.update({ where: { id: oppId }, data: { nextFollowUpAt: null, nextAction: "Email bounced — find another contact" } });
    }
    return { action: "BOUNCE", oppId, snippet: `Bounce for ${addr}` };
  }
  if (e.oppId == null) return null;
  if (e.kind === "AUTO_REPLY") {
    await logActivity(e.oppId, actor, "AUTO_REPLY", "Automatic reply received (ignored; sequence continues).", "EMAIL");
    return { action: "AUTO_REPLY", oppId: e.oppId, snippet: "" };
  }
  const snippet = extractReplyText(e.text) || e.subject;
  const r = await handleInboundReply({ channel: "EMAIL", from: e.from, text: snippet, actor: "inbox", opportunityId: e.oppId });
  if (!r.matched) return null;
  return { action: r.optOut ? "OPT_OUT" : "REPLY", oppId: e.oppId, snippet };
}

export interface InboxResult { configured: boolean; scanned: number; replies: number; optOuts: number; bounces: number; autoReplies: number; ignored: number; error?: string; lastPollAt?: string }

function headerMap(buf?: Buffer): Record<string, string> {
  const out: Record<string, string> = {};
  if (!buf) return out;
  for (const m of buf.toString("utf8").replace(/\r?\n[ \t]+/g, " ").matchAll(/^([A-Za-z-]+):\s*(.*)$/gm)) out[m[1].toLowerCase()] = m[2].trim();
  return out;
}
const idsIn = (v?: string) => (v?.match(/<[^>]+>/g) ?? []).map(normaliseMessageId);

/**
 * Reads recent mail (READ-ONLY: never changes flags, deletes or moves anything) and acts only on messages that are
 * replies to emails we sent, or come from a known prospect. Everything else in the mailbox is ignored and never stored.
 */
export async function pollInbox(): Promise<InboxResult> {
  const cfg = imapConfig();
  const result: InboxResult = { configured: !!cfg, scanned: 0, replies: 0, optOuts: 0, bounces: 0, autoReplies: 0, ignored: 0 };
  if (!cfg) return result;

  const lastRow = await prisma.systemSetting.findUnique({ where: { key: LAST_POLL_KEY } });
  const last = typeof lastRow?.value === "string" ? new Date(lastRow.value) : null;
  const since = last ? new Date(Math.max(last.getTime() - 2 * 86400_000, Date.now() - 14 * 86400_000)) : new Date(Date.now() - 3 * 86400_000);

  const [opps, sent] = await Promise.all([
    prisma.osOpportunity.findMany({ where: { orgId: ORG_ID, contactEmail: { not: null } }, select: { id: true, contactEmail: true } }),
    prisma.osOutreach.findMany({ where: { orgId: ORG_ID, channel: "EMAIL", providerRef: { not: null } }, select: { opportunityId: true, providerRef: true } }),
  ]);
  const byEmail = new Map(opps.map((o) => [(o.contactEmail as string).toLowerCase(), o.id]));
  const byThread = new Map(sent.map((s) => [normaliseMessageId(s.providerRef), s.opportunityId]));
  const known = new Set(byEmail.keys());
  const ours = new Set([process.env.SMTP_USER, process.env.SMTP_FROM, process.env.REPLY_TO].filter(Boolean).map((x) => String(x).toLowerCase().replace(/^.*<|>.*$/g, "")));

  const client = new ImapFlow({ host: cfg.host, port: cfg.port, secure: cfg.secure, auth: { user: cfg.user, pass: cfg.pass }, logger: false, socketTimeout: 30_000 });
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const found = (await client.search({ since }, { uid: true })) || [];
      const uids = found.slice(-MAX_SCAN);
      result.scanned = uids.length;
      if (!uids.length) return await finish(result);

      // Pass 1: cheap envelope + headers for everything in the window.
      type Cand = { uid: number; from: string; subject: string; date: Date; messageId: string; oppId: number | null; kind: ReturnType<typeof classifyEmail> };
      const cands: Cand[] = [];
      for await (const m of client.fetch(uids.join(","), { uid: true, envelope: true, headers: ["in-reply-to", "references", "auto-submitted", "precedence", "x-autoreply"] }, { uid: true })) {
        const from = (m.envelope?.from?.[0]?.address ?? "").toLowerCase();
        if (!from || ours.has(from)) continue;
        const h = headerMap(m.headers as Buffer | undefined);
        const threadIds = [...idsIn(h["in-reply-to"]), ...idsIn(h.references)];
        const oppId = threadIds.map((t) => byThread.get(t)).find((x) => x != null) ?? byEmail.get(from) ?? null;
        const kind = classifyEmail({ from, subject: m.envelope?.subject, autoSubmitted: h["auto-submitted"], precedence: h.precedence, xAutoreply: h["x-autoreply"] });
        if (oppId == null && kind !== "BOUNCE") { result.ignored++; continue; }
        cands.push({ uid: m.uid, from, subject: m.envelope?.subject ?? "", date: new Date(m.envelope?.date ?? Date.now()), messageId: normaliseMessageId(m.envelope?.messageId) || `uid-${m.uid}-${+new Date(m.envelope?.date ?? 0)}`, oppId, kind });
      }

      const done = new Set((await prisma.osInboundEmail.findMany({ where: { orgId: ORG_ID, messageId: { in: cands.map((c) => c.messageId) } }, select: { messageId: true } })).map((d) => d.messageId));
      for (const c of cands.filter((x) => !done.has(x.messageId))) {
        const dl = await client.fetchOne(String(c.uid), { source: true }, { uid: true });
        if (!dl || !dl.source) continue;
        const parsed = await simpleParser(dl.source);
        const text = parsed.text ?? "";
        const outcome = await actOnEmail({ kind: c.kind, from: c.from, subject: c.subject, text, oppId: c.oppId, byEmail, known });
        if (!outcome) { result.ignored++; continue; }
        const { action, oppId, snippet } = outcome;
        if (action === "BOUNCE") result.bounces++; else if (action === "AUTO_REPLY") result.autoReplies++; else if (action === "OPT_OUT") result.optOuts++; else if (action === "REPLY") result.replies++;
        await prisma.osInboundEmail.createMany({ data: [{ orgId: ORG_ID, messageId: c.messageId, fromAddress: c.from, subject: c.subject.slice(0, 250), receivedAt: c.date, matchedOpportunityId: oppId, action, snippet: snippet.slice(0, 1000) || null }], skipDuplicates: true });
      }
    } finally {
      lock.release();
    }
    return await finish(result);
  } catch (e) {
    result.error = e instanceof Error ? e.message.slice(0, 200) : "IMAP error";
    return result;
  } finally {
    await client.logout().catch(() => undefined);
  }

  async function finish(r: InboxResult) {
    r.lastPollAt = new Date().toISOString();
    await prisma.systemSetting.upsert({ where: { key: LAST_POLL_KEY }, create: { key: LAST_POLL_KEY, value: r.lastPollAt }, update: { value: r.lastPollAt } });
    if (r.replies || r.optOuts || r.bounces) await audit({ actor: "inbox", actorType: "WEBHOOK", action: "inbox.poll", resource: "inbox", output: { replies: r.replies, optOuts: r.optOuts, bounces: r.bounces, scanned: r.scanned } });
    return r;
  }
}
