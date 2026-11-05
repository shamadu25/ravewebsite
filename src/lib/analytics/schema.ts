import { z } from "zod";

export const SESSION_TIMEOUT_MS = 30 * 60_000;
export const MAX_BATCH = 25;
/** Longest span a single heartbeat may add — a lost/duplicated beacon can never inflate engagement beyond this. */
export const MAX_HEARTBEAT_SECONDS = 35;

export const EVENT_TYPES = [
  "page_view", "page_exit", "session_start", "session_end", "engagement_heartbeat",
  "click", "scroll", "outbound_click", "internal_navigation", "file_download", "video_play", "video_complete",
  "cta_click", "form_view", "form_start", "form_field_interaction", "form_submit_attempt", "form_submit_success", "form_submit_failure", "lead_created",
  "pricing_view", "product_view", "contact_page_view", "whatsapp_click", "phone_click", "email_click", "demo_request",
  "web_vital", "js_error", "request_failed", "request_timing",
] as const;

/** Events the browser may NOT claim: they are written only by the server after the real outcome is known. */
export const SERVER_ONLY_EVENTS = new Set(["lead_created", "form_submit_success", "form_submit_failure", "session_end"]);

const id = z.string().regex(/^[A-Za-z0-9_-]{8,40}$/);
const str = (n: number) => z.string().max(n * 2).transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, n));

/** Keys that could carry personal or sensitive data are dropped from event properties regardless of what the browser sends. */
const SENSITIVE_KEY = /pass|pwd|secret|token|card|cvv|cvc|iban|ssn|email|phone|mobile|tel|message|msg|comment|name|address|value|text/i;

export function cleanProps(input: unknown): Record<string, string | number | boolean> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>).slice(0, 20)) {
    if (!/^[A-Za-z0-9_]{1,40}$/.test(k) || SENSITIVE_KEY.test(k)) continue;
    if (typeof v === "string") out[k] = v.replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, 120);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = Math.round(v * 1000) / 1000;
    else if (typeof v === "boolean") out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

const EventSchema = z.object({
  id,
  type: z.string().regex(/^(custom_)?[a-z0-9_]{2,36}$/),
  t: z.number().int().optional(), // client timestamp (ms) — only used to order events; bounded against server time
  path: str(300).optional(),
  pv: id.optional(), // pageview id
  props: z.unknown().optional(),
});

export const CollectSchema = z.object({
  v: z.literal(1),
  vid: id,
  sid: id,
  consent: z.boolean().optional(),
  ctx: z
    .object({
      path: str(300),
      title: str(255).optional(),
      referrer: str(500).optional(),
      qs: z.record(z.string().max(40), z.string().max(400)).optional(), // whitelisted campaign params only
      screen: str(20).optional(),
      viewport: str(20).optional(),
      lang: str(20).optional(),
      tz: str(64).optional(),
    })
    .optional(),
  events: z.array(EventSchema).min(1).max(MAX_BATCH),
});
export type CollectPayload = z.infer<typeof CollectSchema>;
export type CollectEvent = z.infer<typeof EventSchema>;

const CAMPAIGN_PARAMS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "ttclid", "li_fat_id", "solution"]);
export function campaignParams(qs: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(qs ?? {})) if (CAMPAIGN_PARAMS.has(k)) out[k] = v.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 300);
  return out;
}
