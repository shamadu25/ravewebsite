/** Deterministic first-pass reply classifier (directive §7/§8). Text is data, never instructions. */
export const REPLY_LABELS = ["INTERESTED", "INFO_REQUEST", "PRICING", "MEETING", "NOT_INTERESTED", "NOT_NOW", "REFERRAL", "OBJECTION", "OUT_OF_OFFICE", "UNSUBSCRIBE", "COMPLAINT", "UNKNOWN"] as const;
export type ReplyLabel = (typeof REPLY_LABELS)[number];
export interface ReplyClassification { label: ReplyLabel; stopSequence: boolean; suppress: boolean; genuineInterest: boolean; followUpAfter?: Date }

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** "contact me in January" -> first day of the next such month (UTC). */
export function parseFutureDate(text: string, now = new Date()): Date | undefined {
  const m = text.toLowerCase().match(/\b(?:in|after|around|by)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  if (!m) return;
  const idx = MONTHS.indexOf(m[1]);
  let y = now.getUTCFullYear();
  if (idx <= now.getUTCMonth()) y += 1;
  return new Date(Date.UTC(y, idx, 1));
}

const R = {
  complaint: /\b(spam|report(ing)? you|illegal|gdpr violation|how did you get my)\b/i,
  unsub: /\b(unsubscribe|remove me|take me off|stop (emailing|contacting|sending)|do not (email|contact)|don'?t (email|contact) me|opt[- ]?out)\b/i,
  ooo: /\b(out of (the )?office|auto[- ]?reply|automatic reply|on (annual )?leave|on vacation|away from (my )?(desk|email)|will (be )?(back|return)(ing)? (on|in))\b/i,
  notInterested: /\b(not interested|no thanks|no thank you|we('re| are) (all set|good)|not a fit|already have)\b/i,
  notNow: /\b(not now|not at the moment|maybe later|contact me (later|again)|reach out (again )?(in|later)|circle back|next (quarter|year)|contact me in|call me in)\b/i,
  referral: /\b(speak to|talk to|contact|reach out to|forwarded? (this )?to|cc'?d?|the right person (is|would be))\b.*\b(who|he|she|my colleague|our (head|manager|director)|[a-z]+@[a-z0-9.-]+)/i,
  pricing: /\b(price|pricing|cost|how much|quote|quotation|rates?|fees?)\b/i,
  meeting: /\b(meeting|call|demo|schedule|book|available (on|at)|calendar|zoom|teams)\b/i,
  info: /\b(more info|more information|details|brochure|send (me )?(over )?(some|the)|how does (it|this) work|tell me more)\b/i,
  evaluating: /\b(evaluating|looking at|considering|shortlist|interested)\b/i,
  objection: /\b(too expensive|budget|no budget|already (use|using)|happy with|not (a )?priority|concerned about|security)\b/i,
};

export function classifyReply(rawText: string, now = new Date()): ReplyClassification {
  // Only the top-most reply text matters; strip quoted history.
  const text = rawText.split(/\n(?:>|On .+ wrote:|-{2,}\s*Original)/)[0].slice(0, 4000);
  const out = (label: ReplyLabel, o: Partial<ReplyClassification> = {}): ReplyClassification => ({ label, stopSequence: true, suppress: false, genuineInterest: false, ...o });
  if (R.complaint.test(text)) return out("COMPLAINT", { suppress: true });
  if (R.unsub.test(text)) return out("UNSUBSCRIBE", { suppress: true });
  // An automatic away message must never be read as interest, whatever else it says.
  if (R.ooo.test(text)) return { label: "OUT_OF_OFFICE", stopSequence: false, suppress: false, genuineInterest: false };
  if (R.notNow.test(text)) return out("NOT_NOW", { followUpAfter: parseFutureDate(text, now) });
  if (R.notInterested.test(text) && !R.pricing.test(text) && !R.meeting.test(text)) return out("NOT_INTERESTED", { suppress: true });
  if (R.referral.test(text) && !R.pricing.test(text)) return out("REFERRAL");
  if (R.pricing.test(text)) return out("PRICING", { genuineInterest: true });
  if (R.meeting.test(text)) return out("MEETING", { genuineInterest: true });
  if (R.info.test(text)) return out("INFO_REQUEST", { genuineInterest: true });
  if (R.evaluating.test(text)) return out("INTERESTED", { genuineInterest: true });
  if (R.objection.test(text)) return out("OBJECTION");
  return out("UNKNOWN");
}
