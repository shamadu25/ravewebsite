/** Dialling codes for the countries RaveSoft sells in, used to turn local numbers like 0244… into international form. */
const DIAL: Record<string, string> = { ghana: "233", nigeria: "234", kenya: "254", "south africa": "27", "ivory coast": "225", "côte d'ivoire": "225", "cote d'ivoire": "225", senegal: "221", tanzania: "255", uganda: "256", ethiopia: "251", rwanda: "250", cameroon: "237", zambia: "260", zimbabwe: "263", togo: "228", benin: "229" };

/** Returns digits-only international number, or null if it can't be determined safely. */
export function internationalDigits(phone: string | null | undefined, country?: string | null): string | null {
  if (!phone) return null;
  const raw = phone.trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (raw.startsWith("+")) return digits.length >= 9 && digits.length <= 15 ? digits : null;
  if (digits.startsWith("00")) return digits.length >= 11 && digits.length <= 17 ? digits.slice(2) : null;
  const code = country ? DIAL[country.trim().toLowerCase()] : undefined;
  if (digits.startsWith("0") && code) { const n = code + digits.slice(1); return n.length >= 9 && n.length <= 15 ? n : null; }
  return digits.length >= 11 && digits.length <= 15 ? digits : null; // already international without the +
}

/** Click-to-chat link: opens the user's own WhatsApp with the text pre-filled. A human taps send — no automation, no API. */
export function waLink(phone: string | null | undefined, text: string, country?: string | null): string | null {
  const n = internationalDigits(phone, country);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

/** Short, human WhatsApp-style opener (not the long email). */
export function whatsappText(opp: { companyName: string; contactName: string | null; recommendedEmployees: unknown; industry: string | null }, sender = "RaveSoft"): string {
  const employee = (opp.recommendedEmployees as string[] | null)?.[0];
  const hi = opp.contactName ? `Hi ${opp.contactName.split(" ")[0]},` : `Hello ${opp.companyName} team,`;
  return `${hi} this is ${sender}. ${employee ? `We build ${employee}-type AI assistants for ${opp.industry ?? "businesses"} that answer customer enquiries and book appointments 24/7.` : "We help businesses answer customer enquiries automatically, 24/7."} Would a quick 10-minute chat this week be useful? If not, just say and I won't message again.`;
}
