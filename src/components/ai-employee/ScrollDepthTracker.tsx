"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/utils";

const THRESHOLDS = [25, 50, 75, 90];

/** Fires ai_employee_scroll_depth once per threshold, per page view. */
export default function ScrollDepthTracker() {
  const fired = useRef<Set<number>>(new Set());

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const pct = (window.scrollY / scrollable) * 100;

      for (const threshold of THRESHOLDS) {
        if (pct >= threshold && !fired.current.has(threshold)) {
          fired.current.add(threshold);
          trackEvent("ai_employee_scroll_depth", { depth: threshold });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
