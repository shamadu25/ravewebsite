"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/utils";
import { captureAttribution } from "@/lib/attribution";

/** Records campaign attribution (first + latest touch) and fires `landing_page_view` once per page load. */
export default function LandingTracker({ solution }: { solution?: string }) {
  useEffect(() => {
    const a = captureAttribution();
    trackEvent("landing_page_view", {
      page: "get-started",
      solution: solution ?? "none",
      utm_source: a.latest.utm_source ?? "none",
      utm_campaign: a.latest.utm_campaign ?? "none",
    });
  }, [solution]);
  return null;
}
