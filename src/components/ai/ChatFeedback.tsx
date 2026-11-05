"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { sendFeedback } from "@/lib/ai/api";
import { trackEvent } from "@/lib/utils";
import type { ChatStrings } from "@/lib/ai/i18n";

interface Props {
  t: ChatStrings;
  conversationId: string;
  /** Email we already hold for this visitor; when set, the transcript goes there and no email field is shown. */
  knownEmail?: string | null;
  onDone: () => void;
}

/** End-of-chat rating, optional comment, and an emailed copy of the conversation (also a contact-capture point). */
export default function ChatFeedback({ t, conversationId, knownEmail, onDone }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [wantTranscript, setWantTranscript] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"idle" | "thanks" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating || busy) return;
    setBusy(true);
    try {
      const res = await sendFeedback(conversationId, {
        rating,
        comment: comment.trim(),
        email: knownEmail ? undefined : email.trim(),
        sendTranscript: wantTranscript && Boolean(knownEmail || email.trim()),
      });
      trackEvent("chat_feedback_submitted", { rating });
      setResult(res.transcript_sent ? "sent" : "thanks");
      window.setTimeout(onDone, 3500);
    } catch {
      setResult("error");
    } finally {
      setBusy(false);
    }
  }

  if (result === "thanks" || result === "sent") {
    return (
      <p role="status" className="max-w-[92%] rounded-2xl px-4 py-3 text-sm bg-green-50 border border-green-200 text-green-900">
        {result === "sent" ? t.feedbackTranscriptSent : t.feedbackThanks}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-[92%] rounded-2xl px-4 py-3 text-sm bg-white border border-blue-200 space-y-2.5">
      <div>
        <p className="font-semibold text-gray-900">{t.feedbackTitle}</p>
        <p className="text-xs text-gray-500">{t.feedbackHelp}</p>
      </div>
      <div className="flex gap-1" role="radiogroup" aria-label={t.feedbackTitle}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} / 5`}
            onClick={() => setRating(n)}
            className="p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
          >
            <Star className={`w-6 h-6 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder={t.feedbackComment}
            aria-label={t.feedbackComment}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={wantTranscript} onChange={(e) => setWantTranscript(e.target.checked)} />
            {t.feedbackEmail}
          </label>
          {wantTranscript && !knownEmail && (
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              aria-label={t.emailPlaceholder}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          )}
        </>
      )}
      {result === "error" && <p className="text-xs text-red-600">{t.feedbackError}</p>}
      <button
        type="submit"
        disabled={!rating || busy}
        className="text-xs font-semibold px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-500 transition-colors"
      >
        {t.feedbackSubmit}
      </button>
    </form>
  );
}
