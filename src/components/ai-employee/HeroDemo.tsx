const SEQUENCE: { role: "assistant" | "visitor" | "action"; text: string }[] = [
  { role: "visitor", text: "Hi, do you have this in stock for delivery this week?" },
  { role: "assistant", text: "Yes! What's your delivery location and roughly when do you need it?" },
  { role: "visitor", text: "Accra, by Friday." },
  { role: "assistant", text: "That works. I can book this in now, or connect you with our team for a custom order." },
  { role: "action", text: "✓ Consultation booked · Follow-up scheduled" },
];

/** Compact, static, illustrative conversation preview for the hero — lightweight
 * (no client JS/animation library), accessible, readable without sound. */
export default function HeroDemo() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5" aria-label="Example AI Employee conversation">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Example conversation</p>
      <div className="space-y-2.5">
        {SEQUENCE.map((m, i) =>
          m.role === "action" ? (
            <p key={i} className="text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 inline-block">
              {m.text}
            </p>
          ) : (
            <div
              key={i}
              className={
                m.role === "assistant"
                  ? "max-w-[90%] rounded-2xl px-3.5 py-2 text-sm leading-snug bg-white/95 text-gray-800 mr-auto"
                  : "max-w-[90%] rounded-2xl px-3.5 py-2 text-sm leading-snug bg-blue-600 text-white ml-auto"
              }
            >
              {m.text}
            </div>
          )
        )}
      </div>
      <p className="text-[11px] text-gray-600 mt-3">Illustrative example, not a real customer conversation.</p>
    </div>
  );
}
