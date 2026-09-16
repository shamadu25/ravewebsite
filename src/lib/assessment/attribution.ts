export interface Attribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  landingVariant: string | null;
  device: string | null;
  landingPage: string | null;
}

const STORAGE_KEY = "rave_ai_employee_attribution";

function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  return /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";
}

/** First-touch attribution: captured once on first visit, persisted so a later
 * session (e.g. after clicking WhatsApp and coming back) doesn't lose the ad's UTM data. */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") {
    return {
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      fbclid: null,
      landingVariant: null,
      device: null,
      landingPage: null,
    };
  }

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Attribution;
  } catch {
    // fall through to fresh capture
  }

  const params = new URL(window.location.href).searchParams;

  const attribution: Attribution = {
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    utmTerm: params.get("utm_term"),
    fbclid: params.get("fbclid"),
    landingVariant: params.get("v"),
    device: detectDevice(),
    landingPage: window.location.pathname,
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // storage unavailable — attribution just won't persist across reloads
  }

  return attribution;
}
