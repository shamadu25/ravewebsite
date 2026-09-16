"use client";

import { useEffect } from "react";

/**
 * Pages that render a sticky mobile CTA bar (spec: "must not cover forms,
 * chat widgets, or navigation") mount this to push the shared floating
 * WhatsApp/chat launcher buttons up above that bar, on mobile only. Resets
 * on unmount so every other page keeps its normal button position.
 */
export default function FabOffsetController() {
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");

    const apply = () => {
      document.documentElement.style.setProperty("--fab-bottom-offset", mql.matches ? "5.25rem" : "1.5rem");
    };

    apply();
    mql.addEventListener("change", apply);

    return () => {
      mql.removeEventListener("change", apply);
      document.documentElement.style.removeProperty("--fab-bottom-offset");
    };
  }, []);

  return null;
}
