"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { COMPANY } from "@/lib/data";
import { cn, trackEvent } from "@/lib/utils";
import {
  ChatMessage,
  ConversationResponse,
  fetchConversation,
  QuickAction,
  sendMessage,
  startConversation,
} from "@/lib/ai/api";
import { buildVisitorContext, getStoredConversationId, storeConversationId } from "@/lib/ai/session";

const FALLBACK_MESSAGE =
  "Our AI assistant is temporarily unavailable. Leave a message on WhatsApp and the RaveSoft team will get back to you.";

function whatsAppUrl(text: string): string {
  return `https://wa.me/${COMPANY.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
}

function whatsAppFallbackUrl(): string {
  return whatsAppUrl("Hi RaveSoft! I was chatting with your AI assistant on the website and need help.");
}

/** Builds a context-carrying WhatsApp message from what's actually been discussed, so the
 * conversation doesn't restart from zero when it moves channels (spec §22). */
function whatsAppContinuationUrl(messages: DisplayMessage[]): string {
  const lastVisitorMessage = [...messages].reverse().find((m) => m.role === "visitor")?.content;
  const topic = lastVisitorMessage ? lastVisitorMessage.slice(0, 200) : null;

  const text = topic
    ? `Hi RaveSoft! I was chatting with Rave AI on your website about: "${topic}". Continuing here.`
    : "Hi RaveSoft! I was chatting with Rave AI on your website and would like to continue here.";

  return whatsAppUrl(text);
}

interface DisplayMessage {
  id: string;
  role: "visitor" | "assistant";
  content: string;
  cta?: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [assistantName, setAssistantName] = useState("Rave AI");
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const initialized = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isSending]);

  const applyConversation = (data: ConversationResponse) => {
    setConversationId(data.id);
    setAssistantName(data.assistant_name);
    setQuickActions(data.quick_actions);
    setMessages(
      data.messages.map((m: ChatMessage) => ({ id: String(m.id), role: m.role, content: m.content }))
    );
  };

  const initConversation = async () => {
    setIsLoading(true);
    setUnavailable(false);

    try {
      const storedId = getStoredConversationId();

      const data = storedId
        ? await fetchConversation(storedId)
        : await startConversation(buildVisitorContext());

      storeConversationId(data.id);
      applyConversation(data);
    } catch {
      setUnavailable(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    trackEvent("chat_opened", { location: "floating_launcher" });

    if (!initialized.current) {
      initialized.current = true;
      void initConversation();
    }
  };

  const submitMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId || isSending) return;

    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "visitor", content: trimmed }]);
    setInputValue("");
    setIsSending(true);

    try {
      const result = await sendMessage(conversationId, trimmed, window.location.pathname);
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}-reply`, role: "assistant", content: result.message, cta: result.cta },
      ]);
      if (result.ai_unavailable) {
        trackEvent("ai_unavailable", {});
      }
      if (result.cta === "whatsapp_continue") {
        trackEvent("whatsapp_continue_suggested", {});
      }
    } catch {
      setUnavailable(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitMessage(inputValue);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={isOpen ? "Close chat" : "Chat with Rave AI"}
        aria-expanded={isOpen}
        className={cn(
          "fixed bottom-6 left-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-[0_8px_32px_rgba(37,99,235,0.45)] hover:shadow-[0_12px_40px_rgba(37,99,235,0.6)] hover:scale-110 transition-all duration-200 bg-blue-600 text-white",
          isOpen && "hidden"
        )}
      >
        <MessageCircle className="w-7 h-7" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={`${assistantName} chat`}
          className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:left-6 z-50 flex flex-col w-full sm:w-96 h-full sm:h-[32rem] sm:rounded-2xl bg-white sm:shadow-2xl border border-gray-200 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shrink-0">
            <div>
              <p className="font-semibold text-sm">{assistantName}</p>
              <p className="text-xs text-blue-100">RaveSoft AI Business Consultant</p>
            </div>
            <div className="flex items-center gap-1">
              {conversationId && !unavailable && (
                <a
                  href={whatsAppContinuationUrl(messages)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("whatsapp_continue_clicked", { location: "header" })}
                  aria-label="Continue this conversation on WhatsApp"
                  title="Continue on WhatsApp"
                  className="p-1.5 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="p-1.5 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Connecting…
              </div>
            )}

            {!isLoading &&
              messages.map((m) => (
                <div key={m.id}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                      m.role === "assistant"
                        ? "bg-white border border-gray-200 text-gray-800 mr-auto"
                        : "bg-blue-600 text-white ml-auto"
                    )}
                  >
                    {m.content}
                  </div>

                  {m.cta === "whatsapp_continue" && (
                    <a
                      href={whatsAppContinuationUrl(messages)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent("whatsapp_continue_clicked", { location: "inline_suggestion" })}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors mr-auto"
                    >
                      Continue on WhatsApp →
                    </a>
                  )}
                </div>
              ))}

            {isSending && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Typing…
              </div>
            )}

            {unavailable && (
              <div className="max-w-[90%] rounded-2xl px-4 py-3 text-sm bg-amber-50 border border-amber-200 text-amber-900 mr-auto space-y-2">
                <p>{FALLBACK_MESSAGE}</p>
                <a
                  href={whatsAppFallbackUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block font-semibold text-blue-700 hover:underline"
                >
                  Continue on WhatsApp →
                </a>
              </div>
            )}

            {!isLoading && !unavailable && messages.length <= 1 && quickActions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => void submitMessage(action.message)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-gray-200 shrink-0">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message…"
              disabled={isLoading || unavailable}
              aria-label="Message"
              className="flex-1 min-w-0 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={isLoading || unavailable || isSending || !inputValue.trim()}
              aria-label="Send message"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-500 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
