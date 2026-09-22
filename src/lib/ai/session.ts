// Client-side visitor/conversation identity for the AI chat widget.
// Never sent server-side except as opaque identifiers (spec §5/§66 data isolation).

const VISITOR_ID_KEY = "rave_ai_visitor_id";
const LANDING_PAGE_KEY = "rave_ai_landing_page";
const CONVERSATION_ID_KEY = "rave_ai_conversation_id";

function safeStorage(storage: () => Storage): Storage | null {
  try {
    return storage();
  } catch {
    return null;
  }
}

export function getVisitorId(): string {
  const storage = safeStorage(() => window.localStorage);
  if (!storage) return crypto.randomUUID();

  const existing = storage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  storage.setItem(VISITOR_ID_KEY, id);
  return id;
}

export function getLandingPage(currentPath: string): string {
  const storage = safeStorage(() => window.sessionStorage);
  if (!storage) return currentPath;

  const existing = storage.getItem(LANDING_PAGE_KEY);
  if (existing) return existing;

  storage.setItem(LANDING_PAGE_KEY, currentPath);
  return currentPath;
}

export function getStoredConversationId(): string | null {
  return safeStorage(() => window.sessionStorage)?.getItem(CONVERSATION_ID_KEY) ?? null;
}

export function storeConversationId(id: string): void {
  safeStorage(() => window.sessionStorage)?.setItem(CONVERSATION_ID_KEY, id);
}

export function clearStoredConversationId(): void {
  safeStorage(() => window.sessionStorage)?.removeItem(CONVERSATION_ID_KEY);
}

export interface VisitorContext {
  visitor_id: string;
  current_page: string;
  landing_page: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  device: string;
  browser: string;
  language: string;
}

function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  return /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";
}

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Chrome")) return "chrome";
  if (ua.includes("Safari")) return "safari";
  if (ua.includes("Firefox")) return "firefox";
  if (ua.includes("Edg")) return "edge";
  return "other";
}

export function buildVisitorContext(): VisitorContext {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  return {
    visitor_id: getVisitorId(),
    current_page: url.pathname,
    landing_page: getLandingPage(url.pathname),
    referrer: document.referrer || null,
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
    device: detectDevice(),
    browser: detectBrowser(),
    language: typeof navigator !== "undefined" ? navigator.language : "en",
  };
}
