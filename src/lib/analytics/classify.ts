/**
 * Pure classification helpers for RaveSoft Intelligence. No I/O — everything here is unit-tested.
 *
 * Channel methodology (documented in docs/intelligence.md):
 *   1. Click id present: gclid → paid_search, fbclid/ttclid/li_fat_id → paid_social.
 *   2. utm_medium: cpc/ppc/paid*search → paid_search; paid_social/paidsocial/social-paid → paid_social;
 *      email/e-mail/newsletter → email; whatsapp (medium or source) → whatsapp; social/social-network → social;
 *      organic → organic_search; referral → referral.
 *   3. No UTMs: the referrer domain decides (search engine → organic_search, social network → social,
 *      mail client → email, wa.me/whatsapp → whatsapp, anything else → referral; own domain → internal).
 *   4. Otherwise direct.
 */

export const CHANNELS = [
  "direct", "organic_search", "paid_search", "social", "paid_social", "referral", "email", "whatsapp", "other",
] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABEL: Record<string, string> = {
  direct: "Direct", organic_search: "Organic search", paid_search: "Paid search", social: "Social media",
  paid_social: "Paid social", referral: "Referral", email: "Email", whatsapp: "WhatsApp", other: "Other",
};

const SEARCH = /(^|\.)(google|bing|yahoo|duckduckgo|baidu|yandex|ecosia|brave|startpage|qwant|naver|seznam)\.[a-z.]+$/i;
const SOCIAL = /(^|\.)(facebook|fb|instagram|linkedin|twitter|x|t|youtube|youtu|tiktok|pinterest|reddit|snapchat|threads|quora|medium)\.(com|be|co|me|net|org)$|^(l|m|lm)\.facebook\.com$|^lnkd\.in$|^t\.co$/i;
const MAIL = /(^|\.)(mail\.google|outlook\.live|outlook\.office|mail\.yahoo|webmail)\.[a-z.]+$|^mail\./i;
const WHATSAPP = /(^|\.)(wa\.me|whatsapp\.com)$/i;

export interface TouchInput {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  clickIdType?: string | null;
  referrerDomain?: string | null;
  /** Own site hostnames — a referrer from these is "internal", never an acquisition source. */
  ownHosts?: string[];
}

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

export function classifyChannel(t: TouchInput): Channel {
  const medium = norm(t.utmMedium);
  const source = norm(t.utmSource);
  const click = norm(t.clickIdType);

  if (click === "gclid") return "paid_search";
  if (click === "fbclid" && !medium) return "paid_social";
  if (click === "ttclid" || click === "li_fat_id") return "paid_social";

  if (medium || source) {
    if (/^(cpc|ppc|paidsearch|paid[-_ ]search|sem|adwords)$/.test(medium)) return "paid_search";
    if (/^(paid[-_ ]?social|social[-_ ]?paid|paidsocial|cpm|display[-_ ]social)$/.test(medium)) return "paid_social";
    if (/^(e-?mail|newsletter)$/.test(medium) || /^(mailchimp|newsletter|sendgrid|brevo)$/.test(source)) return "email";
    if (medium === "whatsapp" || /^(whatsapp|wa)$/.test(source)) return "whatsapp";
    if (/^(social|social[-_ ]network|social[-_ ]media|sm)$/.test(medium)) return click === "fbclid" ? "paid_social" : "social";
    if (medium === "organic") return "organic_search";
    if (medium === "referral") return "referral";
    // A bare utm_source with no medium: judge the source name itself.
    if (SOCIAL.test(`${source}.com`) || /^(facebook|instagram|linkedin|twitter|tiktok|youtube|reddit)$/.test(source)) return click ? "paid_social" : "social";
    if (/^(google|bing)$/.test(source)) return click ? "paid_search" : "organic_search";
    return "other";
  }

  const ref = norm(t.referrerDomain).replace(/^www\./, "");
  if (!ref) return "direct";
  if ((t.ownHosts ?? []).some((h) => ref === h.replace(/^www\./, ""))) return "direct";
  if (WHATSAPP.test(ref)) return "whatsapp";
  if (SEARCH.test(ref)) return "organic_search";
  if (SOCIAL.test(ref)) return "social";
  if (MAIL.test(ref)) return "email";
  return "referral";
}

export function referrerDomain(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase().replace(/^www\./, "").slice(0, 255) || null;
  } catch {
    return null;
  }
}

/** Drops query/hash, keeps only a clean path. Referrers are stored host + path only (query strings can hold personal data). */
export function stripReferrer(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const u = new URL(referrer);
    return `${u.protocol}//${u.hostname}${u.pathname}`.slice(0, 500);
  } catch {
    return null;
  }
}

/** Normalises a page path: site-relative, no query/hash, no trailing slash (except root), max 300 chars. */
export function cleanPath(input: string | null | undefined): string {
  let p = (input ?? "/").trim();
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
  } catch {
    p = "/";
  }
  p = p.split("#")[0].split("?")[0].replace(/[\u0000-\u001F\u007F]/g, "");
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "") || "/";
  return p.slice(0, 300);
}

/** Landing page with only whitelisted campaign params retained (never arbitrary query data). */
export function landingWithCampaign(path: string, params: Record<string, string | undefined>): string {
  const keep = new URLSearchParams();
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "solution"]) {
    const v = params[k];
    if (v) keep.set(k, v.slice(0, 150));
  }
  const qs = keep.toString();
  return `${path}${qs ? `?${qs}` : ""}`.slice(0, 500);
}

const CLICK_IDS = ["gclid", "fbclid", "ttclid", "li_fat_id"] as const;
export function pickClickId(params: Record<string, string | undefined>): { type: string; id: string } | null {
  for (const k of CLICK_IDS) {
    const v = params[k];
    if (v && /^[\w.\-~%]{4,300}$/.test(v)) return { type: k, id: v.slice(0, 300) };
  }
  return null;
}

export interface UaInfo { device: "desktop" | "mobile" | "tablet"; browser: string; browserVersion: string | null; os: string; }

export function parseUserAgent(ua: string | null | undefined): UaInfo {
  const s = ua ?? "";
  let os = "Other";
  if (/Windows NT/i.test(s)) os = "Windows";
  else if (/Android/i.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";
  else if (/Mac OS X|Macintosh/i.test(s)) os = "macOS";
  else if (/CrOS/i.test(s)) os = "ChromeOS";
  else if (/Linux/i.test(s)) os = "Linux";

  let browser = "Other";
  let m: RegExpMatchArray | null;
  if ((m = s.match(/(?:Edg|EdgA|EdgiOS)\/([\d.]+)/))) browser = `Edge|${m[1]}`;
  else if ((m = s.match(/(?:OPR|Opera)\/([\d.]+)/))) browser = `Opera|${m[1]}`;
  else if ((m = s.match(/SamsungBrowser\/([\d.]+)/))) browser = `Samsung Internet|${m[1]}`;
  else if ((m = s.match(/(?:Firefox|FxiOS)\/([\d.]+)/))) browser = `Firefox|${m[1]}`;
  else if ((m = s.match(/(?:Chrome|CriOS)\/([\d.]+)/))) browser = `Chrome|${m[1]}`;
  else if ((m = s.match(/Version\/([\d.]+).*Safari/))) browser = `Safari|${m[1]}`;
  const [name, ver] = browser.split("|");

  let device: UaInfo["device"] = "desktop";
  if (/iPad|Tablet|PlayBook|Silk/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s))) device = "tablet";
  else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(s)) device = "mobile";
  return { device, browser: name, browserVersion: ver ? ver.split(".")[0] : null, os };
}

const BOT = /bot\b|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|outbrain|pinterest|vkshare|w3c_validator|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|headless|phantomjs|puppeteer|playwright|selenium|curl\/|wget|python-requests|httpclient|go-http|java\/|axios|node-fetch|okhttp|scrapy|ahrefs|semrush|mj12|dotbot|petalbot|bytespider|gptbot|claudebot|ccbot|chatgpt|perplexity|preview|archive\.org/i;
export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.length < 12) return true;
  return BOT.test(ua);
}

/** Pages whose view is itself a conversion-intent signal. */
export function intentEventForPath(path: string): "pricing_view" | "product_view" | "contact_page_view" | null {
  if (/^\/(pricing|plans)(\/|$)/.test(path)) return "pricing_view";
  if (/^\/(contact|get-started|book-consultation)(\/|$)/.test(path)) return "contact_page_view";
  if (/^\/(products|services)\/[^/]+/.test(path)) return "product_view";
  return null;
}

// ── Country names / time-zone fallback ────────────────────────────────────────────────────────────────────
const REGION_NAMES = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
export function countryName(code: string | null | undefined): string | null {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  try {
    return REGION_NAMES?.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** Coarse country guess from the browser time zone. Labelled "timezone_estimate" — never presented as a measured location. */
const TZ_COUNTRY: Record<string, string> = {
  "Africa/Accra": "GH", "Africa/Lagos": "NG", "Africa/Nairobi": "KE", "Africa/Johannesburg": "ZA", "Africa/Abidjan": "CI",
  "Africa/Dakar": "SN", "Africa/Dar_es_Salaam": "TZ", "Africa/Kampala": "UG", "Africa/Addis_Ababa": "ET", "Africa/Kigali": "RW",
  "Africa/Douala": "CM", "Africa/Cairo": "EG", "Africa/Casablanca": "MA", "Africa/Algiers": "DZ", "Africa/Tunis": "TN",
  "Europe/London": "GB", "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Dublin": "IE", "Europe/Madrid": "ES", "Europe/Amsterdam": "NL",
  "America/New_York": "US", "America/Chicago": "US", "America/Los_Angeles": "US", "America/Denver": "US", "America/Toronto": "CA",
  "Asia/Dubai": "AE", "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Singapore": "SG", "Australia/Sydney": "AU",
};
export function countryFromTimezone(tz: string | null | undefined): string | null {
  return (tz && TZ_COUNTRY[tz]) || null;
}

export interface Geo {
  country: string | null; countryCode: string | null; region: string | null; city: string | null; continent: string | null;
  geoSource: "edge_headers" | "timezone_estimate" | null;
}

const dec = (v: string | null) => {
  if (!v) return null;
  try { return decodeURIComponent(v).slice(0, 80) || null; } catch { return v.slice(0, 80); }
};

/**
 * IP geolocation done by the hosting edge (Vercel / Cloudflare) and delivered as headers — the IP address itself is never
 * read, stored or sent to a third party. Accuracy is country-level at best; city/region are approximations from the IP's
 * registered location (often the ISP's, not the visitor's) and must never be read as a precise or GPS location.
 */
export function geoFromHeaders(get: (name: string) => string | null, timezone?: string | null): Geo {
  const raw = (get("x-vercel-ip-country") ?? get("cf-ipcountry") ?? "").toUpperCase();
  if (/^[A-Z]{2}$/.test(raw) && raw !== "XX" && raw !== "T1") {
    return {
      countryCode: raw, country: countryName(raw),
      region: dec(get("x-vercel-ip-country-region")) ?? dec(get("cf-region")),
      city: dec(get("x-vercel-ip-city")) ?? dec(get("cf-ipcity")),
      continent: dec(get("x-vercel-ip-continent")) ?? dec(get("cf-ipcontinent")),
      geoSource: "edge_headers",
    };
  }
  const guess = countryFromTimezone(timezone);
  if (guess) return { countryCode: guess, country: countryName(guess), region: null, city: null, continent: null, geoSource: "timezone_estimate" };
  return { country: null, countryCode: null, region: null, city: null, continent: null, geoSource: null };
}
