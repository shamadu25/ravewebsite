"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Keeps server-rendered dashboards live without a manual reload (polling; paused while the tab is hidden). */
export default function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
