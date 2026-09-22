import type { Metadata } from "next";
import "@/components/ai-orb/ai-orb.css";

export const metadata: Metadata = {
  title: "Meet Ama | RaveSoft AI Employee",
  description:
    "An interactive look at Ama, RaveSoft's AI employee — tap the core to see it think, and explore the specialist agents it routes work to.",
  robots: { index: false, follow: false },
};

/**
 * Independent root layout for /ai-agents/demo — a standalone, full-bleed
 * showcase with no Header/Footer/ChatWidget, same pattern as /admin.
 */
export default function AiOrbRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
