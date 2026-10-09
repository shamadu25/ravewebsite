import { createHmac, timingSafeEqual } from "crypto";

const secret = () => process.env.OS_UNSUBSCRIBE_SECRET ?? process.env.ADMIN_SESSION_SECRET ?? "";
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://ravesoftsolutions.com";

/** Signed, tamper-proof unsubscribe link so only the real recipient's address can be opted out (and anyone can do it in one click). */
export function signUnsubscribe(opportunityId: number, address: string): string {
  return createHmac("sha256", secret()).update(`${opportunityId}|${address.toLowerCase()}`).digest("hex").slice(0, 32);
}
export function verifyUnsubscribe(opportunityId: number, address: string, token: string): boolean {
  if (!secret() || token.length !== 32) return false;
  const expected = signUnsubscribe(opportunityId, address);
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
export function unsubscribeUrl(opportunityId: number, address: string): string {
  return `${APP_URL()}/api/os/unsubscribe?o=${opportunityId}&a=${encodeURIComponent(address.toLowerCase())}&t=${signUnsubscribe(opportunityId, address)}`;
}

export const normaliseMessageId = (id?: string | null) => (id ?? "").trim().replace(/^<|>$/g, "").toLowerCase();

/** Our own Message-ID, on the sender's domain, so replies thread back to the exact outreach row. */
export function makeMessageId(outreachId: number, fromAddress: string): string {
  const domain = fromAddress.split("@")[1] ?? "ravesoftsolutions.com";
  return `<os-${outreachId}-${Math.random().toString(36).slice(2, 10)}@${domain}>`;
}

/** Strip quoted history and signatures so the Sales Agent sees only what the prospect actually wrote. */
export function extractReplyText(text: string): string {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (/^On .{5,200}wrote:\s*$/i.test(line) || /^-{2,}\s*Original Message\s*-{2,}/i.test(line) || /^From:\s.+@/i.test(line) && out.length > 0 || /^_{5,}$/.test(line)) break;
    if (line.startsWith(">")) continue;
    out.push(line);
  }
  return out.join("\n").trim().slice(0, 2000);
}

export type EmailKind = "NORMAL" | "AUTO_REPLY" | "BOUNCE";
export function classifyEmail(h: { from: string; subject?: string | null; autoSubmitted?: string | null; precedence?: string | null; xAutoreply?: string | null }): EmailKind {
  const from = h.from.toLowerCase(), subj = (h.subject ?? "").toLowerCase();
  if (/(mailer-daemon|postmaster)@/.test(from) || /(undeliver|delivery status notification|delivery failure|mail delivery failed|returned mail|failure notice)/.test(subj)) return "BOUNCE";
  if ((h.autoSubmitted && h.autoSubmitted.toLowerCase() !== "no") || /^(bulk|junk|auto_reply|list)$/i.test((h.precedence ?? "").trim()) || h.xAutoreply || /^(automatic reply|auto(matic)?[- ]?reply|out of office|autoreply)/.test(subj)) return "AUTO_REPLY";
  return "NORMAL";
}

/** Pull the failed recipient out of a bounce notification, if it names one. */
export function bouncedRecipient(body: string, known: Set<string>): string | null {
  const m = /(?:Final-Recipient|Original-Recipient):\s*rfc822;\s*<?([^\s>]+@[^\s>]+)>?/i.exec(body);
  if (m && known.has(m[1].toLowerCase())) return m[1].toLowerCase();
  for (const e of body.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? []) if (known.has(e.toLowerCase())) return e.toLowerCase();
  return null;
}
