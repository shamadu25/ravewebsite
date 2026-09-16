// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// GA4 + Meta Pixel + Clarity event tracking — safe no-op for any tool that
// isn't loaded (missing env var), so this is safe to call unconditionally.
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined") return;

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
  if (typeof window.fbq === "function") {
    window.fbq("trackCustom", eventName, params);
  }
  if (typeof window.clarity === "function") {
    window.clarity("event", eventName);
  }
}
