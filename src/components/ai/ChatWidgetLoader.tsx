"use client";

import dynamic from "next/dynamic";

// Lazy-loaded so the AI chat bundle never blocks initial page render or
// hurts Core Web Vitals on marketing pages (spec §100/§101).
const ChatWidget = dynamic(() => import("./ChatWidget"), { ssr: false });

export default function ChatWidgetLoader() {
  return <ChatWidget />;
}
