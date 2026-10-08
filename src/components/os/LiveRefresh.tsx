"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Real-time updates via SSE: refreshes server data when the audit stream reports a relevant change. Reconnects automatically. */
export default function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    let es: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let closed = false;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      if (closed) return;
      es = new EventSource("/api/os/events");
      es.addEventListener("change", () => {
        clearTimeout(pending);
        pending = setTimeout(() => router.refresh(), 800); // coalesce bursts
      });
      es.onerror = () => { es?.close(); timer = setTimeout(connect, 2000); };
    };
    connect();
    return () => { closed = true; es?.close(); clearTimeout(timer); clearTimeout(pending); };
  }, [router]);
  return null;
}
