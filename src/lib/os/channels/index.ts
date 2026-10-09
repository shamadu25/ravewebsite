import { getMailTransporter } from "@/lib/mail/transporter";
import type { Channel } from "../constants";

export interface OutboundMessage {
  to: string;
  subject?: string | null;
  body: string;
  /** Email only: threading + compliance headers. */
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  unsubscribeUrl?: string;
}

export type SendResult = { ok: true; providerRef: string } | { ok: false; error: string; notConnected?: boolean };

/** Every provider (SMTP, Twilio, WhatsApp Cloud API, ...) is one implementation of this interface. */
export interface ChannelAdapter {
  channel: Channel;
  provider: string;
  status(): { connected: boolean; reason?: string };
  send(message: OutboundMessage): Promise<SendResult>;
}

const emailAdapter: ChannelAdapter = {
  channel: "EMAIL",
  provider: "smtp",
  status() {
    const ok = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    return ok ? { connected: true } : { connected: false, reason: "SMTP_HOST / SMTP_USER / SMTP_PASS are not set." };
  },
  async send(m) {
    if (!this.status().connected) return { ok: false, notConnected: true, error: "Email (SMTP) is not connected." };
    if (/[\r\n]/.test(m.to) || /[\r\n]/.test(m.subject ?? "")) return { ok: false, error: "Header injection attempt blocked." };
    try {
      const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
      const headers: Record<string, string> = {};
      if (m.unsubscribeUrl) {
        // One-click unsubscribe (RFC 8058) — required by Gmail/Yahoo for bulk senders and a major deliverability signal.
        headers["List-Unsubscribe"] = `<${m.unsubscribeUrl}>, <mailto:${process.env.REPLY_TO ?? from}?subject=unsubscribe>`;
        headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
      }
      const info = await getMailTransporter().sendMail({
        from, to: m.to, replyTo: process.env.REPLY_TO ?? from, subject: m.subject ?? "(no subject)", text: m.body,
        messageId: m.messageId, inReplyTo: m.inReplyTo, references: m.references, headers,
      });
      return { ok: true, providerRef: String(m.messageId ?? info.messageId ?? "smtp") };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "SMTP send failed" };
    }
  },
};

const E164 = /^\+?[1-9]\d{7,14}$/;
const digits = (n: string) => n.replace(/[\s()-]/g, "");

/** WhatsApp Cloud API. NOTE: Meta only allows free-text business-initiated messages inside a 24h customer window;
 * cold outreach needs an approved template, and Meta's rejection is surfaced verbatim rather than hidden. */
const whatsappAdapter: ChannelAdapter = {
  channel: "WHATSAPP",
  provider: "whatsapp-cloud-api",
  status() {
    return process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID ? { connected: true } : { connected: false, reason: "WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID are not set." };
  },
  async send(m) {
    if (!this.status().connected) return { ok: false, notConnected: true, error: "WhatsApp is not connected." };
    const to = digits(m.to);
    if (!E164.test(to)) return { ok: false, error: `"${m.to}" is not a valid international phone number.` };
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/^\+/, ""), type: "text", text: { body: m.body.slice(0, 4000) } }),
        signal: AbortSignal.timeout(15_000),
      });
      const j = (await res.json().catch(() => ({}))) as { messages?: Array<{ id: string }>; error?: { message?: string } };
      return res.ok && j.messages?.[0]?.id ? { ok: true, providerRef: j.messages[0].id } : { ok: false, error: j.error?.message ?? `WhatsApp API ${res.status}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "WhatsApp request failed" };
    }
  },
};

/** SMS through Twilio's REST API. */
const smsAdapter: ChannelAdapter = {
  channel: "SMS",
  provider: "twilio",
  status() {
    return process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM ? { connected: true } : { connected: false, reason: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM are not set." };
  },
  async send(m) {
    if (!this.status().connected) return { ok: false, notConnected: true, error: "SMS is not connected." };
    const to = digits(m.to);
    if (!E164.test(to)) return { ok: false, error: `"${m.to}" is not a valid international phone number.` };
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID as string;
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: to.startsWith("+") ? to : `+${to}`, From: process.env.TWILIO_FROM as string, Body: m.body.slice(0, 1500) }),
        signal: AbortSignal.timeout(15_000),
      });
      const j = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
      return res.ok && j.sid ? { ok: true, providerRef: j.sid } : { ok: false, error: j.message ?? `Twilio ${res.status}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Twilio request failed" };
    }
  },
};

/** Placeholder adapters report NOT CONNECTED truthfully until a provider implementation is registered. */
function notConnected(channel: Channel, envHint: string): ChannelAdapter {
  return {
    channel,
    provider: "none",
    status: () => ({ connected: false, reason: `No ${channel} provider configured (${envHint}).` }),
    send: async () => ({ ok: false, notConnected: true, error: `${channel} integration is not connected.` }),
  };
}

const adapters: Record<Channel, ChannelAdapter> = {
  EMAIL: emailAdapter,
  WHATSAPP: whatsappAdapter,
  SMS: smsAdapter,
  LINKEDIN: notConnected("LINKEDIN", "LinkedIn automation provider"),
  WEB_CHAT: notConnected("WEB_CHAT", "outbound web chat is not supported"),
  VOICE: notConnected("VOICE", "voice provider credentials"),
};

export function getChannelAdapter(channel: Channel): ChannelAdapter {
  return adapters[channel];
}

export function registerChannelAdapter(adapter: ChannelAdapter): void {
  adapters[adapter.channel] = adapter;
}

export function channelStatuses() {
  return (Object.keys(adapters) as Channel[]).map((c) => ({ channel: c, provider: adapters[c].provider, ...adapters[c].status() }));
}
