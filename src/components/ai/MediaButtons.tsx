"use client";

import { useRef, useState } from "react";
import { Camera, Mic, Square } from "lucide-react";

interface Props { conversationId: string | null; disabled: boolean; onText: (text: string) => void }

/** Lets a visitor send a photo or a voice note. We read it into text and send that as the chat message; the file is never stored. */
export default function MediaButtons({ conversationId, disabled, onText }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const canRecord = typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  async function upload(blob: Blob, name: string) {
    if (!conversationId) return;
    setBusy(true); setNote(null);
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], name, { type: blob.type }));
      fd.append("conversationId", conversationId);
      const res = await fetch("/api/ai/media", { method: "POST", body: fd });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.text) onText(j.text); else setNote(j?.error ?? "Couldn't read that file.");
    } catch { setNote("Couldn't send that. Please try again."); } finally { setBusy(false); }
  }

  async function toggleRecord() {
    if (recording) { recRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        clearTimeout(stopTimer.current); stream.getTracks().forEach((t) => t.stop()); setRecording(false);
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size > 0) void upload(blob, "voice-note.webm");
      };
      rec.start(); recRef.current = rec; setRecording(true);
      stopTimer.current = setTimeout(() => rec.state === "recording" && rec.stop(), 60_000); // 60 s max keeps files small
    } catch { setNote("Microphone access was blocked. You can type your message instead."); }
  }

  const btn = "flex items-center justify-center w-9 h-9 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40";
  const off = disabled || busy || !conversationId;
  return (
    <>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f, f.name); }} />
      <button type="button" aria-label="Attach a photo" title="Send a photo (menu, price list, screenshot…)" disabled={off || recording} onClick={() => fileRef.current?.click()} className={btn}><Camera className="w-4 h-4" /></button>
      {canRecord && <button type="button" aria-label={recording ? "Stop recording" : "Record a voice note"} title={recording ? "Tap to stop and send" : "Send a voice note"} disabled={off && !recording} onClick={toggleRecord} className={`${btn} ${recording ? "!border-red-400 !bg-red-50 !text-red-600" : ""}`}>{recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}</button>}
      {(busy || note || recording) && <span role="status" className="absolute -top-6 left-3 right-3 truncate rounded-md bg-white/95 px-2 py-0.5 text-[11px] text-gray-600 shadow-sm">{recording ? "Recording… tap ■ to send" : busy ? "Reading your message…" : note}</span>}
    </>
  );
}
