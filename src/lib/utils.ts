// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// GA4 + Meta Pixel + Clarity event tracking — safe no-op for any tool that
// isn't loaded (missing env var), so this is safe to call unconditionally.
export interface TrackOptions {
  /** Shared browser/server event id so Meta can de-duplicate this event against a future Conversions API event. */
  eventId?: string;
  /** Also send this as a Meta STANDARD event (e.g. "Lead") — the one ad campaigns can optimise for. */
  metaStandard?: "Lead" | "Contact" | "ViewContent";
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
  options?: TrackOptions
) {
  if (typeof window === "undefined") return;

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
  if (typeof window.fbq === "function") {
    const meta = options?.eventId ? { eventID: options.eventId } : undefined;
    if (options?.metaStandard) window.fbq("track", options.metaStandard, params, meta);
    window.fbq("trackCustom", eventName, params, meta);
  }
  if (typeof window.clarity === "function") {
    window.clarity("event", eventName);
  }
}
