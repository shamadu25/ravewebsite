"use client";

/**
 * The orb's real interaction: a compact chat panel wired to the same AI
 * backend as the site's main ChatWidget (src/lib/ai/api.ts). Sending a
 * message drives the orb into "thinking", and the reply drives it into
 * "speaking" for a few seconds — this is what turns the tap-to-energize
 * gesture from a decorative loop into a live demo of the actual product.
 */

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, X } from "lucide-react";
import {
  ChatMessage,
  fetchConversation,
  sendMessage,
  startConversation,
} from "@/lib/ai/api";
import { buildVisitorContext, getStoredConversationId, storeConversationId } from "@/lib/ai/session";
import type { OrbState } from "@/components/ai-orb/ApexHeroOrb";

interface DisplayMessage {
  id: string;
  role: "visitor" | "assistant";
  content: string;
}

const ACCENT = "#00e5ff";

// A real reply can take several seconds (no streaming yet) — without a
// progressive message a long wait reads as broken rather than working.
const THINKING_STAGES = [
  { after: 0, text: "Ama is thinking…" },
  { after: 4000, text: "Reading through the details…" },
  { after: 9000, text: "Putting together a full answer…" },
  { after: 16000, text: "Almost there — thorough answers take a little longer…" },
];

function useThinkingLabel(active: boolean): string {
  const [label, setLabel] = useState(THINKING_STAGES[0].text);

  useEffect(() => {
    if (!active) return;
    const timers = THINKING_STAGES.map((stage) => setTimeout(() => setLabel(stage.text), stage.after));
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return label;
}

export default function AmaChatPanel({
  open,
  onClose,
  onStateChange,
}: {
  open: boolean;
  onClose: () => void;
  onStateChange: (s: OrbState) => void;
}) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const initialized = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingLabel = useThinkingLabel(isSending);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => () => { if (speakTimer.current) clearTimeout(speakTimer.current); }, []);

  useEffect(() => {
    if (!open || initialized.current) return;
    initialized.current = true;

    (async () => {
      setIsLoading(true);
      try {
        const storedId = getStoredConversationId();
        const data = storedId
          ? await fetchConversation(storedId)
          : await startConversation(buildVisitorContext());
        storeConversationId(data.id);
        setConversationId(data.id);
        setMessages(
          data.messages.map((m: ChatMessage) => ({ id: String(m.id), role: m.role, content: m.content }))
        );
      } catch {
        setUnavailable(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [open]);

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId || isSending) return;

    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "visitor", content: trimmed }]);
    setInputValue("");
    setIsSending(true);
    onStateChange("thinking");

    try {
      const result = await sendMessage(conversationId, trimmed, window.location.pathname);
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}-reply`, role: "assistant", content: result.message },
      ]);
      onStateChange("speaking");
      if (speakTimer.current) clearTimeout(speakTimer.current);
      speakTimer.current = setTimeout(() => onStateChange("idle"), 6000);
    } catch {
      setUnavailable(true);
      onStateChange("idle");
    } finally {
      setIsSending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Chat with Ama"
      style={{
        position: "fixed", right: "clamp(12px, 3vw, 32px)", bottom: "clamp(12px, 3vh, 32px)",
        width: "min(380px, 92vw)", height: "min(560px, 78vh)", zIndex: 70,
        background: "rgba(4,3,12,0.94)", backdropFilter: "blur(24px)",
        border: `1px solid ${ACCENT}33`, borderRadius: 18,
        boxShadow: `0 0 60px ${ACCENT}1a, 0 12px 48px rgba(0,0,0,0.65)`,
        display: "flex", flexDirection: "column", overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", borderBottom: `1px solid ${ACCENT}22`,
        background: `linear-gradient(135deg, ${ACCENT}14 0%, transparent 100%)`,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", color: ACCENT }}>AMA</div>
          <div style={{ fontSize: 10, color: "rgba(240,237,232,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
            RaveSoft AI Employee — live
          </div>
        </div>
        <button
          type="button" onClick={onClose} aria-label="Close chat"
          style={{ background: "none", border: "none", color: "rgba(240,237,232,0.5)", cursor: "pointer", padding: 6 }}
        >
          <X size={18} />
        </button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(240,237,232,0.5)", fontSize: 12.5 }}>
            <Loader2 size={14} className="animate-spin" /> Connecting to Ama…
          </div>
        )}

        {!isLoading && messages.length === 0 && !unavailable && (
          <div style={{ color: "rgba(240,237,232,0.55)", fontSize: 12.5, lineHeight: 1.6 }}>
            This is the real Ama — the same AI employee RaveSoft builds for clients. Ask it something,
            like how it would handle a slow-reply problem or an after-hours lead.
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              maxWidth: "86%", padding: "9px 13px", borderRadius: 14, fontSize: 13, lineHeight: 1.55,
              whiteSpace: "pre-wrap",
              alignSelf: m.role === "assistant" ? "flex-start" : "flex-end",
              background: m.role === "assistant" ? "rgba(255,255,255,0.06)" : `${ACCENT}22`,
              border: m.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${ACCENT}44`,
              color: "#f0ede8",
            }}
          >
            {m.content}
          </div>
        ))}

        {isSending && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(240,237,232,0.5)", fontSize: 12.5 }}>
            <Loader2 size={14} className="animate-spin" /> {thinkingLabel}
          </div>
        )}

        {unavailable && (
          <div style={{ padding: "10px 13px", borderRadius: 12, background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.3)", color: "#f5d199", fontSize: 12.5 }}>
            Ama is temporarily unavailable. Try the live site chat, or{" "}
            <a href="/contact" style={{ color: ACCENT, textDecoration: "underline" }}>contact RaveSoft directly</a>.
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void submit(inputValue); }}
        style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${ACCENT}1a` }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask Ama anything…"
          disabled={isLoading || unavailable}
          aria-label="Message"
          style={{
            flex: 1, minWidth: 0, borderRadius: 10, border: `1px solid ${ACCENT}33`,
            background: "rgba(255,255,255,0.04)", color: "#f0ede8", padding: "9px 12px", fontSize: 13,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isLoading || unavailable || isSending || !inputValue.trim()}
          aria-label="Send message"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38,
            borderRadius: 10, border: "none", background: ACCENT, color: "#04080f",
            cursor: "pointer", opacity: isLoading || unavailable || isSending || !inputValue.trim() ? 0.4 : 1,
          }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
