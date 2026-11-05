"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { trackEvent } from "@/lib/utils";
import type { ChatStrings } from "@/lib/ai/i18n";

// Same Calendly account the /book-consultation page uses.
const CALENDLY_URL = "https://calendly.com/ravesoftsolutions23";

/** CTAs from the agent that mean "the visitor is ready to talk to us" — they get the inline calendar. */
export const BOOKING_CTAS = ["book_demo", "book_consultation", "talk_to_sales", "request_proposal"];

export function buildBookingUrl(opts: { name?: string | null; email?: string | null; conversationId?: string | null; host?: string }): string {
  const p = new URLSearchParams({
    hide_gdpr_banner: "1",
    embed_type: "Inline",
    utm_source: "website_chat",
    utm_medium: "chat",
  });
  if (opts.host) p.set("embed_domain", opts.host);
  if (opts.name?.trim()) p.set("name", opts.name.trim());
  if (opts.email?.trim()) p.set("email", opts.email.trim());
  if (opts.conversationId) p.set("utm_campaign", opts.conversationId);
  return `${CALENDLY_URL}?${p.toString()}`;
}

interface Props {
  t: ChatStrings;
  conversationId: string | null;
  name?: string | null;
  email?: string | null;
}

/** "Pick a time" card inside the chat. Contact details we already hold pre-fill the Calendly form. */
export default function ChatBooking({ t, conversationId, name, email }: Props) {
  const [open, setOpen] = useState(false);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://calendly.com") return;
      const data = event.data as { event?: string } | null;
      if (data?.event === "calendly.event_scheduled") {
        setBooked(true);
        setOpen(false);
        trackEvent("consultation_booked", { location: "chat" });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open]);

  if (booked) {
    return <p className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ {t.booked}</p>;
  }

  return (
    <div className="max-w-[92%] rounded-2xl border border-blue-200 bg-blue-50 p-3 space-y-2">
      <p className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
        <CalendarDays className="w-4 h-4" aria-hidden="true" /> {t.bookTitle}
      </p>
      {open ? (
        <>
          <iframe
            title={t.bookTitle}
            src={buildBookingUrl({ name, email, conversationId, host: typeof window !== "undefined" ? window.location.hostname : undefined })}
            className="w-full h-[26rem] rounded-lg border border-blue-100 bg-white"
          />
          <button type="button" onClick={() => setOpen(false)} className="text-xs font-medium text-blue-700 hover:underline">
            {t.bookHide}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            trackEvent("chat_booking_opened", {});
          }}
          className="text-xs font-semibold px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          {t.bookButton}
        </button>
      )}
    </div>
  );
}
