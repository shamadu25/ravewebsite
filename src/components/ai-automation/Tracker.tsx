"use client";

import { useEffect } from "react";

/** Privacy-conscious analytics beacon: anonymous per-tab session id, no cookies, no IP stored, no PII. */
export function sessionId(): string {
  try {
    let s = sessionStorage.getItem("ra-sid");
    if (!s) { s = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); sessionStorage.setItem("ra-sid", s); }
    return s;
  } catch { return "anon" + Math.random().toString(36).slice(2, 10); }
}

export function beacon(name: string, extra: { industry?: string | null; step?: number } = {}) {
  try {
    const body = JSON.stringify({ name, session: sessionId(), industry: extra.industry ?? undefined, step: extra.step });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/ai-automation/events", new Blob([body], { type: "application/json" }));
    else fetch("/api/ai-automation/events", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => undefined);
  } catch { /* analytics must never break the page */ }
}

export default function Tracker({ industry }: { industry?: string }) {
  useEffect(() => { beacon(industry ? "industry_page_view" : "page_view", { industry }); }, [industry]);
  return null;
}
