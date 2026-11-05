import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ai/rateLimit";
import { sharedRateLimit } from "./sharedLimit";
import { verifyFormToken } from "./formToken";
import { analyzeContent, type ContentInput } from "./content";
import { turnstileEnabled, verifyTurnstile } from "./turnstile";

export interface FormPolicy {
  /** Short stable name, used in rate-limit keys and spam logs (e.g. "contact"). */
  form: string;
  /** Minimum seconds between the form being loaded and submitted. Humans take longer than bots. */
  minAgeMs: number;
  perIp: { max: number; windowMs: number };
  perEmail?: { max: number; windowMs: number };
  global: { max: number; windowMs: number };
  /** Skip content heuristics (e.g. chat start has no free text). */
  skipContent?: boolean;
}

/** Tuned per form. Limits are deliberately generous for humans and tight for scripts. */
export const POLICIES = {
  contact: { form: "contact", minAgeMs: 4_000, perIp: { max: 5, windowMs: 10 * 60_000 }, perEmail: { max: 3, windowMs: 60 * 60_000 }, global: { max: 60, windowMs: 60 * 60_000 } },
  assessment: { form: "assessment", minAgeMs: 6_000, perIp: { max: 5, windowMs: 10 * 60_000 }, perEmail: { max: 3, windowMs: 60 * 60_000 }, global: { max: 60, windowMs: 60 * 60_000 } },
  // AI Automation assessment: long multi-step form (people take minutes), so the time-trap is short but the per-IP/email caps stay tight.
  aiAssessment: { form: "ai_assessment", minAgeMs: 15_000, perIp: { max: 6, windowMs: 10 * 60_000 }, perEmail: { max: 4, windowMs: 60 * 60_000 }, global: { max: 120, windowMs: 60 * 60_000 } },
  // Ad traffic: mobile carriers often put many real visitors behind one public IP, so the per-IP cap is generous;
  // the per-email, global and content/token checks do the real work. Per-email is 8/hour (not 3) because retries and
  // genuine second enquiries from the same business must not be blocked.
  getStarted: { form: "get_started", minAgeMs: 3_000, perIp: { max: 15, windowMs: 10 * 60_000 }, perEmail: { max: 8, windowMs: 60 * 60_000 }, global: { max: 300, windowMs: 60 * 60_000 } },
  chatStart: { form: "chat_start", minAgeMs: 0, perIp: { max: 10, windowMs: 10 * 60_000 }, global: { max: 600, windowMs: 60 * 60_000 }, skipContent: true },
} satisfies Record<string, FormPolicy>;

export interface GuardInput extends ContentInput {
  ip: string;
  formToken?: string | null;
  turnstileToken?: string | null;
  /** Honeypot field value — must be empty. */
  honeypot?: string | null;
}

export type GuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string; reason: string; /** Pretend success to the (bot) client. */ silent?: boolean };

const REFRESH = "Please refresh the page and try again.";

/** Bounded, de-identified log of blocked attempts so the admin can see protection working. */
const LOG_MAX_PER_HOUR = 200;
async function recordBlock(form: string, reason: string, ip: string): Promise<void> {
  console.warn(`[antispam] blocked ${form}: ${reason}`);
  if (rateLimit("antispam:log", LOG_MAX_PER_HOUR, 60 * 60_000)) return;
  try {
    await prisma.conversionEvent.create({
      data: {
        eventType: "spam_blocked",
        occurredAt: new Date(),
        metadata: { form, reason, ipHash: createHash("sha256").update(ip).digest("hex").slice(0, 12) },
      },
    });
  } catch {
    // logging must never affect the request
  }
}

/**
 * Runs every protection in order: IP/global rate limits (shared across serverless instances) → honeypot → signed time-trap token → optional
 * Turnstile → content heuristics → per-email limit. Returns the first failure.
 */
export async function guardForm(policy: FormPolicy, input: GuardInput): Promise<GuardResult> {
  const { form } = policy;
  const block = async (r: Extract<GuardResult, { ok: false }>): Promise<GuardResult> => {
    if (r.status !== 429) await recordBlock(form, r.reason, input.ip);
    return r;
  };

  if (await sharedRateLimit(`${form}:ip:${input.ip}`, policy.perIp.max, policy.perIp.windowMs))
    return block({ ok: false, status: 429, reason: "ip_rate", error: "Too many requests. Please try again shortly." });
  if (await sharedRateLimit(`${form}:global`, policy.global.max, policy.global.windowMs))
    return block({ ok: false, status: 429, reason: "global_rate", error: "We're receiving a lot of requests right now. Please try again in a few minutes." });
  if (input.honeypot) return block({ ok: false, status: 200, reason: "honeypot", error: "", silent: true });

  const token = verifyFormToken(input.formToken, policy.minAgeMs);
  if (!token.ok) {
    // Too fast = a script. Everything else is most likely a stale page.
    return block({
      ok: false,
      status: 422,
      reason: `token_${token.reason}`,
      error: token.reason === "too_fast" ? "That was a little too quick — please try again." : REFRESH,
    });
  }

  if (turnstileEnabled()) {
    const t = await verifyTurnstile(input.turnstileToken, input.ip);
    if (!t.ok) return block({ ok: false, status: 422, reason: "turnstile_failed", error: "Please complete the verification check and try again." });
  }

  if (!policy.skipContent) {
    const verdict = analyzeContent(input);
    if (verdict.spam)
      return block({
        ok: false,
        status: 422,
        reason: `content:${verdict.reasons.join(",")}`,
        error: "We couldn't send your message. Please remove any links and try again, or contact us on WhatsApp.",
      });
  }

  // Per-email limit LAST, and only for attempts that passed every other check. Otherwise a spammer could
  // burn a real customer's quota by submitting junk with their address (a lock-out attack).
  if (policy.perEmail && input.email && (await sharedRateLimit(`${form}:email:${input.email.toLowerCase()}`, policy.perEmail.max, policy.perEmail.windowMs)))
    return block({ ok: false, status: 429, reason: "email_rate", error: "You've already sent several messages. We'll reply as soon as we can." });

  return { ok: true };
}
