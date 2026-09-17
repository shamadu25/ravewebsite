"use client";

import { useEffect } from "react";
import Script from "next/script";
import { trackEvent } from "@/lib/utils";

interface CalendlyEmbed {
  event: {
    uri: string;
  };
  invitee: {
    uri: string;
  };
}

function isCalendlyEvent(data: unknown): data is { event: string; payload?: CalendlyEmbed } {
  return typeof data === "object" && data !== null && "event" in data;
}

/** Calendly's inline widget, loaded client-side only. Listens for Calendly's
 * postMessage events so an actual booking (not just a widget view) gets
 * tracked as a real conversion, not just a click on the CTA that got them
 * here. */
export default function CalendlyEmbed({ url }: { url: string }) {
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://calendly.com") return;
      if (!isCalendlyEvent(event.data)) return;

      if (event.data.event === "calendly.event_scheduled") {
        trackEvent("consultation_booked", { location: "book_consultation_page" });
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <>
      <div
        className="calendly-inline-widget"
        data-url={url}
        style={{ minWidth: "280px", height: "700px" }}
      />
      <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="lazyOnload" />
    </>
  );
}
