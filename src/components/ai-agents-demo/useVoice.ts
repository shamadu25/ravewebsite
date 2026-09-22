"use client";

/**
 * Browser-native voice in/out for the chat panel — no third-party API, no
 * added cost or backend change. Speech recognition (dictation) only has
 * real browser support in Chromium-based browsers; speech synthesis
 * (Ama speaking back) is broadly supported, including Safari/iOS. Both
 * capabilities are feature-detected independently and the UI hides
 * whichever isn't available rather than showing a broken control.
 */

import { useEffect, useRef, useState } from "react";

// TS's lib.dom.d.ts ships only fragments of the (still non-standard) Web
// Speech API — SpeechRecognitionResultList exists but SpeechRecognition
// itself doesn't, so the shape used here is declared locally.
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoice(onFinalTranscript: (text: string) => void) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Lazy init runs client-side on first render (this is a "use client" hook),
  // so these are correct immediately — no effect/state-sync needed for a
  // one-time feature check.
  const [micSupported] = useState(() => getRecognitionCtor() !== null);
  const [speechSupported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const onFinalRef = useRef(onFinalTranscript);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  });

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = typeof navigator !== "undefined" ? navigator.language : "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (final.trim()) {
        setInterimTranscript("");
        onFinalRef.current(final.trim());
      } else {
        setInterimTranscript(interim);
      }
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      setMicError(event.error === "not-allowed" ? "Microphone access was denied." : "Couldn't hear that — try again.");
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, []);

  const startListening = () => {
    if (!recognitionRef.current || isListening) return;
    setMicError(null);
    setInterimTranscript("");
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // start() throws if already started — safe to ignore
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const speak = (text: string, handlers: { onStart?: () => void; onEnd?: () => void } = {}) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    if (handlers.onStart) utterance.onstart = handlers.onStart;
    if (handlers.onEnd) utterance.onend = handlers.onEnd;
    window.speechSynthesis.speak(utterance);
  };

  const cancelSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  return {
    micSupported,
    speechSupported,
    isListening,
    interimTranscript,
    micError,
    startListening,
    stopListening,
    speak,
    cancelSpeaking,
  };
}
