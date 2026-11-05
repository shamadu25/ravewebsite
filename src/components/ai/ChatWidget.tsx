"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import MediaButtons from "@/components/ai/MediaButtons";
import ChatBooking, { BOOKING_CTAS } from "@/components/ai/ChatBooking";
import ChatFeedback from "@/components/ai/ChatFeedback";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X, Send, Loader2, Flag } from "lucide-react";
import { COMPANY } from "@/lib/data";
import { cn, trackEvent } from "@/lib/utils";
import {
  ChatMessage,
  ConversationResponse,
  fetchConversation,
  fetchUpdates,
  QuickAction,
  sendMessage,
  startConversation,
  streamUrl,
  UpdatesResponse,
} from "@/lib/ai/api";
import { chatLang, chatStrings, type ChatLang } from "@/lib/ai/i18n";
import { nudgeForPath, type Nudge } from "@/lib/ai/nudges";
import { buildVisitorContext, getStoredConversationId, storeConversationId } from "@/lib/ai/session";
import { OPEN_CHAT_EVENT, OpenChatDetail } from "@/lib/ai/openChat";

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
    ? `Hi RaveSoft! I was chatting with Ama on your website about: "${topic}". Continuing here.`
    : "Hi RaveSoft! I was chatting with Ama on your website and would like to continue here.";

  return whatsAppUrl(text);
}

interface DisplayMessage {
  id: string;
  role: "visitor" | "assistant" | "agent";
  content: string;
  cta?: string;
}

const EXIT_CAPTURE_SHOWN_KEY = "rave_exit_capture_shown";
const CONTACT_CAPTURED_KEY = "rave_contact_captured";
const EXIT_INTENT_FALLBACK_MS = 45000;
const NUDGE_SEEN_PREFIX = "rave_nudge_seen:";
const FEEDBACK_DONE_PREFIX = "rave_chat_feedback_done:";

function readFeedbackDone(conversationId: string): boolean {
  try {
    return sessionStorage.getItem(FEEDBACK_DONE_PREFIX + conversationId) === "1";
  } catch {
    return false;
  }
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [assistantName, setAssistantName] = useState("Ama");
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [contactCaptured, setContactCapturedState] = useState(false);
  const [showExitCapture, setShowExitCapture] = useState(false);
  const [captureEmail, setCaptureEmail] = useState("");
  const [captureWhatsapp, setCaptureWhatsapp] = useState("");
  const [captureSubmitting, setCaptureSubmitting] = useState(false);
  const [unread, setUnread] = useState(0);
  const [humanActive, setHumanActive] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [contact, setContact] = useState<ConversationResponse["contact"]>(null);
  const [chatClosed, setChatClosed] = useState(false);
  const [ending, setEnding] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [sseFailed, setSseFailed] = useState(false);
  const [nudgeState, setNudge] = useState<(Nudge & { path: string }) | null>(null);
  const pathname = usePathname();
  // Browser language without a hydration mismatch: "en" on the server, the real value once on the client.
  const browserLanguage = useSyncExternalStore(
    () => () => undefined,
    () => navigator.language,
    () => "en"
  );
  const lang: ChatLang = chatLang(browserLanguage);
  const t = chatStrings(lang);
  // A nudge belongs to the page it was shown for; navigating away hides it.
  const nudge = nudgeState && nudgeState.path === (pathname ?? "") ? nudgeState : null;
  const lastAgentIdRef = useRef(0);
  const initialized = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);


  const setContactCaptured = (value: boolean) => {
    setContactCapturedState(value);
    if (value) {
      try {
        sessionStorage.setItem(CONTACT_CAPTURED_KEY, "1");
      } catch {
        // sessionStorage unavailable (private mode etc.) — non-critical
      }
    }
  };

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CONTACT_CAPTURED_KEY) === "1") setContactCapturedState(true);
    } catch {
      // ignore
    }
  }, []);

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
    lastAgentIdRef.current = data.messages.reduce((max, m) => (m.role === "agent" ? Math.max(max, m.id) : max), 0);
    setHumanActive(data.status === "human_active");
    setContact(data.contact ?? null);
    setChatClosed(data.status === "closed");
    if (data.rating || readFeedbackDone(data.id)) setFeedbackDone(true);
    if (data.contact_captured) setContactCaptured(true);
  };

  const initConversation = async (): Promise<string | null> => {
    setIsLoading(true);
    setUnavailable(false);

    try {
      const storedId = getStoredConversationId();

      const data = storedId
        ? await fetchConversation(storedId)
        : await startConversation(buildVisitorContext());

      storeConversationId(data.id);
      applyConversation(data);
      return data.id;
    } catch {
      setUnavailable(true);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const submitMessage = async (text: string, conversationIdOverride?: string) => {
    const trimmed = text.trim();
    const id = conversationIdOverride ?? conversationId;
    if (!trimmed || !id || isSending) return;

    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "visitor", content: trimmed }]);
    setInputValue("");
    setIsSending(true);
    // Writing again reopens a closed chat and cancels any pending "end chat" feedback prompt.
    setChatClosed(false);
    setEnding(false);

    try {
      const result = await sendMessage(id, trimmed, window.location.pathname);
      if (result.human_active) {
        // A team member is handling this chat: no AI bubble — their reply arrives via polling.
        setHumanActive(true);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `local-${Date.now()}-reply`, role: "assistant", content: result.message, cta: result.cta },
        ]);
      }
      if (result.ai_unavailable) {
        trackEvent("ai_unavailable", {});
      }
      if (result.cta === "whatsapp_continue") {
        trackEvent("whatsapp_continue_suggested", {});
      }
      if (result.contact_captured) {
        setContactCaptured(true);
        setShowExitCapture(false);
        // Pull the captured name/email so the inline booking calendar can be pre-filled.
        if (!contact?.email) void fetchConversation(id).then((d) => setContact(d.contact ?? null)).catch(() => undefined);
      }
    } catch {
      setUnavailable(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleOpen = (detail: OpenChatDetail = {}) => {
    setIsOpen(true);
    setUnread(0);
    setNudge(null);
    trackEvent("chat_opened", { location: detail.initialMessage ? "cta" : "floating_launcher" });

    if (!initialized.current) {
      initialized.current = true;
      void initConversation().then((id) => {
        if (id && detail.initialMessage) {
          void submitMessage(detail.initialMessage, id);
        }
      });
    } else if (detail.initialMessage) {
      void submitMessage(detail.initialMessage);
    }
  };

  useEffect(() => {
    const onOpenRequest = (event: Event) => {
      const detail = (event as CustomEvent<OpenChatDetail>).detail ?? {};
      handleOpen(detail);
    };

    window.addEventListener(OPEN_CHAT_EVENT, onOpenRequest);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpenRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Applies team replies / chat state from either the SSE stream or the polling fallback. */
  const applyUpdates = useCallback((res: Partial<UpdatesResponse> & { messages: UpdatesResponse["messages"] }) => {
    if (typeof res.human_active === "boolean") setHumanActive(res.human_active);
    if (typeof res.agent_typing === "boolean") setAgentTyping(res.agent_typing);
    if (typeof res.closed === "boolean") setChatClosed(res.closed);
    if (res.messages.length > 0) {
      lastAgentIdRef.current = Math.max(lastAgentIdRef.current, ...res.messages.map((m) => m.id));
      setAgentTyping(false);
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        const fresh = res.messages.filter((m) => !known.has(String(m.id)));
        return fresh.length
          ? [...prev, ...fresh.map((m) => ({ id: String(m.id), role: m.role, content: m.content }))]
          : prev;
      });
      if (!isOpenRef.current) setUnread((n) => n + res.messages.length);
      trackEvent("team_reply_received", {});
    }
  }, []);

  /** Live channel while the chat is open: Server-Sent Events deliver team replies and "typing" within ~2s with
   * no polling. The server ends each stream after ~25s and the browser reconnects (Last-Event-ID keeps it
   * gap-free). If SSE is unavailable or keeps failing, `sseFailed` hands over to the polling effect below. */
  useEffect(() => {
    if (!conversationId || unavailable || !isOpen || sseFailed || typeof EventSource === "undefined") return;

    let source: EventSource | null = null;
    let failures = 0;

    const connect = () => {
      if (source || document.visibilityState !== "visible") return;
      source = new EventSource(streamUrl(conversationId, lastAgentIdRef.current));
      source.onopen = () => {
        failures = 0;
      };
      source.addEventListener("message", (e) => {
        try {
          applyUpdates({ messages: [JSON.parse((e as MessageEvent).data)] });
        } catch {
          // malformed event — ignore, the next one will carry on
        }
      });
      source.addEventListener("state", (e) => {
        try {
          applyUpdates({ messages: [], ...JSON.parse((e as MessageEvent).data) });
        } catch {
          // ignore
        }
      });
      source.onerror = () => {
        // The server closes the stream every ~25s on purpose; the browser reconnects by itself. Only a
        // connection that is closed for good (HTTP error) or fails repeatedly switches to polling.
        failures += 1;
        if (source?.readyState === EventSource.CLOSED || failures >= 4) {
          source?.close();
          source = null;
          setSseFailed(true);
        }
      };
    };
    const disconnect = () => {
      source?.close();
      source = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? connect() : disconnect());

    connect();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      disconnect();
    };
  }, [conversationId, unavailable, isOpen, sseFailed, applyUpdates]);

  /** Polling: the whole mechanism while the chat is closed (cheap, feeds the unread badge) and the fallback when
   * streaming is unavailable. Pauses when the tab is hidden. */
  useEffect(() => {
    if (!conversationId || unavailable) return;
    const sseActive = isOpen && !sseFailed && typeof EventSource !== "undefined";
    if (sseActive) return;
    let stopped = false;
    const tick = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetchUpdates(conversationId, lastAgentIdRef.current);
        if (!stopped) applyUpdates(res);
      } catch {
        // transient network error or rate limit — try again on the next tick
      }
    };
    const timer = window.setInterval(() => void tick(), isOpen ? 4000 : 20000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [conversationId, unavailable, isOpen, sseFailed, applyUpdates]);

  /** Proactive nudge: after a short time on a high-intent page, a small bubble offers help that is specific to
   * the page. Once per page-type per session; never while the chat is open or after it was dismissed. */
  useEffect(() => {
    const path = pathname ?? "";
    const candidate = nudgeForPath(path, lang);
    if (!candidate) return;
    try {
      if (sessionStorage.getItem(NUDGE_SEEN_PREFIX + candidate.key) === "1") return;
    } catch {
      // storage unavailable — fall through; worst case the nudge shows again on reload
    }
    const timer = window.setTimeout(() => {
      if (isOpenRef.current) return;
      try {
        sessionStorage.setItem(NUDGE_SEEN_PREFIX + candidate.key, "1");
      } catch {
        // ignore
      }
      trackEvent("chat_nudge_shown", { nudge: candidate.key });
      setNudge({ ...candidate, path });
    }, candidate.delayMs);
    return () => window.clearTimeout(timer);
  }, [pathname, lang]);

  /** Nudges visitors who haven't left contact details toward doing so before
   * they leave the site — desktop exit-intent (mouse toward the tab/URL bar)
   * plus a time-on-site fallback that also covers mobile, where exit-intent
   * can't be detected. Fires at most once per session. */
  useEffect(() => {
    if (contactCaptured) return;

    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(EXIT_CAPTURE_SHOWN_KEY) === "1";
    } catch {
      // ignore
    }
    if (alreadyShown) return;

    const trigger = () => {
      if (isOpenRef.current) return;
      let shown = false;
      try {
        shown = sessionStorage.getItem(EXIT_CAPTURE_SHOWN_KEY) === "1";
        if (!shown) sessionStorage.setItem(EXIT_CAPTURE_SHOWN_KEY, "1");
      } catch {
        // ignore
      }
      if (shown) return;

      trackEvent("exit_intent_capture_shown", {});
      setShowExitCapture(true);
      setIsOpen(true);
      trackEvent("chat_opened", { location: "exit_intent" });

      if (!initialized.current) {
        initialized.current = true;
        void initConversation();
      }
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) trigger();
    };

    document.addEventListener("mouseleave", onMouseLeave);
    const timer = window.setTimeout(trigger, EXIT_INTENT_FALLBACK_MS);

    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactCaptured]);

  const handleCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = captureEmail.trim();
    const whatsapp = captureWhatsapp.trim();
    if (!email && !whatsapp) return;

    setCaptureSubmitting(true);
    trackEvent("exit_intent_capture_submitted", {});

    const text =
      email && whatsapp
        ? `My email is ${email} and my WhatsApp number is ${whatsapp}.`
        : email
          ? `My email is ${email}.`
          : `My WhatsApp number is ${whatsapp}.`;

    await submitMessage(text);

    setCaptureSubmitting(false);
    setShowExitCapture(false);
    setCaptureEmail("");
    setCaptureWhatsapp("");
  };

  const handleCaptureDismiss = () => {
    trackEvent("exit_intent_capture_dismissed", {});
    setShowExitCapture(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitMessage(inputValue);
  };

  return (
    <>
      {nudge && !isOpen && (
        <div
          role="status"
          className="fixed right-6 z-50 w-64 max-w-[calc(100vw-3rem)] rounded-2xl rounded-br-sm bg-white border border-gray-200 shadow-xl p-3 pr-8 animate-in fade-in"
          style={{ bottom: "calc(var(--fab-bottom-offset, 1.5rem) + 4.25rem)" }}
        >
          <button
            type="button"
            onClick={() => {
              trackEvent("chat_nudge_clicked", { nudge: nudge.key });
              handleOpen({ initialMessage: nudge.initialMessage });
            }}
            className="text-left text-sm text-gray-800 leading-snug hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
          >
            {nudge.text}
          </button>
          <button
            type="button"
            onClick={() => {
              trackEvent("chat_nudge_dismissed", { nudge: nudge.key });
              setNudge(null);
            }}
            aria-label={t.nudgeDismiss}
            className="absolute top-1.5 right-1.5 p-1 rounded-full text-gray-400 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div
        className={cn("rave-chat-launcher fixed right-6 z-50", isOpen && "hidden")}
        style={{ bottom: "var(--fab-bottom-offset, 1.5rem)" }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-blue-500 opacity-60 animate-ping [animation-duration:2.5s] pointer-events-none"
        />
        <button
          type="button"
          onClick={() => handleOpen()}
          aria-label={`Chat with ${assistantName} — ${t.online.toLowerCase()}`}
          aria-expanded={isOpen}
          className="relative flex items-center justify-center w-14 h-14 rounded-full overflow-hidden ring-2 ring-white shadow-[0_8px_32px_rgba(37,99,235,0.45)] hover:shadow-[0_12px_40px_rgba(37,99,235,0.6)] hover:scale-110 transition-all duration-200 bg-blue-600"
        >
          <Image src="/img/ama.png" alt="" width={56} height={56} className="w-full h-full object-cover" />
        </button>
        {unread > 0 && (
          <span
            role="status"
            aria-label={`${unread} new repl${unread === 1 ? "y" : "ies"} from the RaveSoft team`}
            className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white"
          >
            {unread}
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white pointer-events-none"
        />
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-label={`${assistantName} chat`}
          className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 flex flex-col w-full sm:w-96 h-full sm:h-[32rem] sm:rounded-2xl bg-white sm:shadow-2xl border border-gray-200 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <Image
                  src="/img/ama.png"
                  alt=""
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-white/40"
                />
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-blue-600"
                />
              </div>
              <div>
                <p className="font-semibold text-sm">{assistantName}</p>
                <p className="text-xs text-blue-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" aria-hidden="true" />
                  {t.online}
                </p>
              </div>
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
              {conversationId && !unavailable && !feedbackDone && !ending && !chatClosed && messages.some((m) => m.role === "visitor") && (
                <button
                  type="button"
                  onClick={() => {
                    setEnding(true);
                    trackEvent("chat_end_clicked", {});
                  }}
                  aria-label={t.endChat}
                  title={t.endChat}
                  className="p-1.5 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <Flag className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t.closeChat}
                className="p-1.5 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> {t.connecting}
              </div>
            )}

            {!isLoading &&
              messages.map((m) => (
                <div key={m.id}>
                  {m.role === "agent" && (
                    <p className="text-[11px] font-semibold text-blue-700 mb-0.5">{t.teamLabel}</p>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                      m.role !== "visitor"
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
                      {t.continueWhatsApp}
                    </a>
                  )}

                  {m.cta && BOOKING_CTAS.includes(m.cta) && (
                    <div className="mt-2">
                      <ChatBooking
                        t={t}
                        conversationId={conversationId}
                        name={[contact?.first_name, contact?.last_name].filter(Boolean).join(" ") || null}
                        email={contact?.email}
                      />
                    </div>
                  )}
                </div>
              ))}

            {humanActive && (
              <p className="text-xs text-center text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                {t.teamOnChat}
              </p>
            )}

            {agentTyping && (
              <div role="status" className="flex items-center gap-2 text-gray-500 text-xs">
                <span className="flex gap-0.5" aria-hidden="true">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                </span>
                {t.teamTyping}
              </div>
            )}

            {isSending && !humanActive && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> {t.typing}
              </div>
            )}

            {conversationId && !unavailable && !feedbackDone && (chatClosed || ending) && (
              <ChatFeedback
                t={t}
                conversationId={conversationId}
                knownEmail={contact?.email}
                onDone={() => {
                  try {
                    sessionStorage.setItem(FEEDBACK_DONE_PREFIX + conversationId, "1");
                  } catch {
                    // ignore
                  }
                  setFeedbackDone(true);
                  setEnding(false);
                }}
              />
            )}

            {unavailable && (
              <div className="max-w-[90%] rounded-2xl px-4 py-3 text-sm bg-amber-50 border border-amber-200 text-amber-900 mr-auto space-y-2">
                <p>{t.unavailable}</p>
                <a
                  href={whatsAppFallbackUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block font-semibold text-blue-700 hover:underline"
                >
                  {t.continueWhatsApp}
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

            {showExitCapture && !contactCaptured && !unavailable && (
              <div className="max-w-[92%] rounded-2xl px-4 py-3 text-sm bg-blue-50 border border-blue-200 text-blue-900 space-y-2">
                <p className="font-semibold">{t.exitTitle}</p>
                <p className="text-blue-800/80 text-xs leading-relaxed">
                  {t.exitBody}
                </p>
                <form onSubmit={handleCaptureSubmit} className="space-y-2 pt-1">
                  <input
                    type="email"
                    value={captureEmail}
                    onChange={(e) => setCaptureEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    aria-label={t.emailPlaceholder}
                    className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <input
                    type="tel"
                    value={captureWhatsapp}
                    onChange={(e) => setCaptureWhatsapp(e.target.value)}
                    placeholder={t.whatsappPlaceholder}
                    aria-label={t.whatsappPlaceholder}
                    className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={captureSubmitting || isLoading || (!captureEmail.trim() && !captureWhatsapp.trim())}
                      className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-500 transition-colors"
                    >
                      {captureSubmitting ? t.exitSending : t.exitSend}
                    </button>
                    <button
                      type="button"
                      onClick={handleCaptureDismiss}
                      className="text-xs font-medium text-blue-700 hover:underline px-2"
                    >
                      {t.exitDismiss}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="relative flex items-center gap-2 p-3 border-t border-gray-200 shrink-0">
            <MediaButtons conversationId={conversationId} disabled={isLoading || unavailable || isSending} onText={(text) => void submitMessage(text)} />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t.placeholder}
              disabled={isLoading || unavailable}
              aria-label={t.messageLabel}
              className="flex-1 min-w-0 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={isLoading || unavailable || isSending || !inputValue.trim()}
              aria-label={t.send}
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
