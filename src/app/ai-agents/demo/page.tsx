"use client";

import { useState } from "react";
import ApexWorld from "@/components/ai-orb/ApexWorld";
import ApexOverviewPanel from "@/components/ai-orb/ApexOverviewPanel";
import AmaChatPanel from "@/components/ai-agents-demo/AmaChatPanel";
import ActivityFeed from "@/components/ai-agents-demo/ActivityFeed";
import { BrandBadge, Headline, TrustStrip } from "@/components/ai-agents-demo/DemoOverlay";
import type { OrbState } from "@/components/ai-orb/ApexHeroOrb";

export default function AiAgentsDemo() {
  const [chatOpen, setChatOpen] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>("idle");

  return (
    <main
      id="main"
      style={{ background: "#04080f", color: "#f0ede8", position: "relative", overflow: "hidden" }}
    >
      {/* Top-left overview HUD: clock + weather + social links */}
      <ApexOverviewPanel />

      {/* Brand + conversion CTA, headline, and the bottom trust strip — what
          makes this a RaveSoft product demo, not just a tech showcase. */}
      <BrandBadge />
      <Headline />
      <TrustStrip />
      <ActivityFeed />

      {/* The world: orb core + orbiting agent graph. Tapping the core opens a
          real chat with Ama — the same AI backend the main site uses — and
          drives the orb's thinking/speaking states from the actual reply. */}
      <section style={{ position: "relative", height: "100vh", minHeight: 620 }}>
        <ApexWorld state={orbState} onCoreTap={() => setChatOpen((o) => !o)} />
      </section>

      <AmaChatPanel open={chatOpen} onClose={() => setChatOpen(false)} onStateChange={setOrbState} />
    </main>
  );
}
