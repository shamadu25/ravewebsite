"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fillCanned, type CannedReply } from "@/lib/os/cannedReplies";

interface Props {
  /** POST /api/os/conversations/:id — actions: reply, suggest. */
  url: string;
  /** POST /api/os/conversations/:id/typing — "team is typing" ping for the visitor's widget. */
  typingUrl: string;
  firstName: string | null;
  canned: CannedReply[];
  humanActive: boolean;
}

const TYPING_PING_MS = 5_000;

/** Reply box for a live chat: one-click canned replies, an AI-drafted reply to edit, and a typing indicator. */
export default function ChatReplyBox({ url, typingUrl, firstName, canned, humanActive }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"send" | "suggest" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const lastPing = useRef(0);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Request failed (${res.status}).`);
    return json?.data as { message?: string; draft?: string };
  };

  const ping = (value: string) => {
    const now = Date.now();
    if (!value.trim() || now - lastPing.current < TYPING_PING_MS) return;
    lastPing.current = now;
    void fetch(typingUrl, { method: "POST" }).catch(() => undefined);
  };

  const insert = (value: string) => {
    setText((prev) => (prev.trim() ? `${prev.trimEnd()}\n${value}` : value));
    ping(value);
  };

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setBusy("send");
    setMsg(null);
    try {
      const data = await post({ action: "reply", message });
      setText("");
      lastPing.current = 0;
      setMsg({ ok: true, text: data.message ?? "Reply sent." });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not send." });
    } finally {
      setBusy(null);
    }
  }

  async function suggest() {
    if (busy) return;
    setBusy("suggest");
    setMsg(null);
    try {
      const data = await post({ action: "suggest" });
      if (data.draft) {
        setText(data.draft);
        setMsg({ ok: true, text: "AI draft inserted — read it, edit it, then send." });
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not draft a reply." });
    } finally {
      setBusy(null);
    }
  }

  const field = "w-full rounded-[10px] border border-[var(--border)] bg-white px-3 py-2 text-[14px] focus:border-[var(--primary-bright)] focus:outline-none";

  return (
    <form onSubmit={send} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Insert a canned reply"
          value=""
          onChange={(e) => {
            const reply = canned.find((c) => c.key === e.target.value);
            if (reply) insert(fillCanned(reply.body, firstName));
          }}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Canned reply…</option>
          {canned.map((c) => (
            <option key={c.key} value={c.key}>
              {c.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void suggest()}
          disabled={busy !== null}
          className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-800 hover:bg-purple-100 disabled:opacity-50"
        >
          {busy === "suggest" ? "Drafting…" : "✨ Suggest a reply"}
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">Message to visitor</span>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            ping(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
          }}
          rows={4}
          maxLength={4000}
          required
          placeholder="Hi, this is the RaveSoft team…"
          className={field}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy !== null || !text.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy === "send" ? "Sending…" : "Send reply"}
        </button>
        <span className="text-xs text-gray-400">Ctrl/⌘ + Enter to send{humanActive ? " · the visitor sees “typing…” while you write" : ""}</span>
        {msg && <span className={`text-xs ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}
