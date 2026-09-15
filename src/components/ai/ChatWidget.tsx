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

function whatsAppFallbackUrl(): string {
  const text = "Hi RaveSoft! I was chatting with your AI assistant on the website and need help.";
  return `https://wa.me/${COMPANY.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
}

interface DisplayMessage {
  id: string;
  role: "visitor" | "assistant";
  content: string;
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
        { id: `local-${Date.now()}-reply`, role: "assistant", content: result.message },
      ]);
      if (result.ai_unavailable) {
        trackEvent("ai_unavailable", {});
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
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="p-1 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Connecting…
              </div>
            )}

            {!isLoading &&
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    m.role === "assistant"
                      ? "bg-white border border-gray-200 text-gray-800 mr-auto"
                      : "bg-blue-600 text-white ml-auto"
                  )}
                >
                  {m.content}
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
