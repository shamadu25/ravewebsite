import type { Metadata } from "next";
import "@/components/ai-orb/ai-orb.css";
import GoogleAnalytics from "@/components/seo/GoogleAnalytics";
import MetaPixel from "@/components/seo/MetaPixel";
import ClarityScript from "@/components/seo/ClarityScript";
import { ROSTER } from "@/components/ai-orb/roster";

const TITLE = "Meet Ama | RaveSoft AI Employee";
const DESCRIPTION =
  `A live, interactive look at Ama — RaveSoft's AI employee — and the full ${ROSTER.length}-agent team she runs with. Tap the core to chat with the real thing.`;

export const metadata: Metadata = {
  metadataBase: new URL("https://ravesoftsolutions.com"),
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/ai-agents/demo",
    images: [{ url: "/img/ama.png", width: 1254, height: 1254, alt: "Ama, RaveSoft's AI employee" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/img/ama.png"],
  },
};

/**
 * Independent root layout for /ai-agents/demo — a standalone, full-bleed
 * showcase with no Header/Footer/ChatWidget, same pattern as /admin.
 * Carries its own analytics scripts since it doesn't share the marketing
 * layout that normally loads them.
 */
export default function AiOrbRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <GoogleAnalytics />
        <MetaPixel />
        <ClarityScript />
      </body>
    </html>
  );
}
