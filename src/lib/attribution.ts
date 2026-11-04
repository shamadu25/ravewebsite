"use client";

/**
 * Campaign attribution for paid-social traffic. Stores ONLY campaign metadata (UTM values, fbclid, landing URL,
 * referrer, timestamp) — never anything typed into a form. Uses localStorage like the site's existing visitor id.
 *   first  = the visitor's first recorded touch (kept)
 *   latest = the most recent campaign touch (updated whenever the URL carries campaign parameters)
 */
export interface Touch {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  landingUrl: string;
  referrer: string;
  capturedAt: string;
}
export interface Attribution {
  first: Touch;
  latest: Touch;
}

const FIRST_KEY = "rave_attr_first";
const LATEST_KEY = "rave_attr_latest";
const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const;

const clip = (s: string, n: number) => s.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, n);

function read(key: string): Touch | null {
  try {
    const raw = window.localStorage.getItem(key);
    const t = raw ? (JSON.parse(raw) as Touch) : null;
    return t && typeof t.landingUrl === "string" ? t : null;
  } catch {
    return null;
  }
}
function write(key: string, t: Touch): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(t));
  } catch {
    // storage blocked (private mode) — attribution simply won't persist across pages
  }
}

/** Builds a touch from the current URL. Only whitelisted query keys are kept in the stored landing URL. */
export function currentTouch(now = new Date()): Touch {
  const url = new URL(window.location.href);
  const touch: Touch = { landingUrl: "", referrer: clip(document.referrer || "", 500), capturedAt: now.toISOString() };
  const kept = new URLSearchParams();
  for (const k of CAMPAIGN_KEYS) {
    const v = url.searchParams.get(k);
    if (v) {
      touch[k] = clip(v, k === "fbclid" ? 300 : 150);
      kept.set(k, touch[k] as string);
    }
  }
  const sol = url.searchParams.get("solution");
  if (sol) kept.set("solution", clip(sol, 60));
  const qs = kept.toString();
  touch.landingUrl = clip(`${url.pathname}${qs ? `?${qs}` : ""}`, 500);
  return touch;
}

const hasCampaign = (t: Touch) => CAMPAIGN_KEYS.some((k) => Boolean(t[k]));

/** Records this visit and returns first + latest touch. Safe to call more than once per page. */
export function captureAttribution(now = new Date()): Attribution {
  const cur = currentTouch(now);
  const first = read(FIRST_KEY) ?? cur;
  if (!read(FIRST_KEY)) write(FIRST_KEY, first);

  // "latest" moves only when this visit carries campaign data (or nothing has been stored yet), so a later
  // plain visit does not erase the ad click that actually brought the person here.
  let latest = read(LATEST_KEY);
  if (!latest || hasCampaign(cur)) {
    latest = cur;
    write(LATEST_KEY, latest);
  }
  return { first, latest };
}
