"use client";

import { useState } from "react";
import ApexWorld from "@/components/ai-orb/ApexWorld";
import ApexOverviewPanel from "@/components/ai-orb/ApexOverviewPanel";
import AmaChatPanel from "@/components/ai-agents-demo/AmaChatPanel";
import ActivityFeed from "@/components/ai-agents-demo/ActivityFeed";
import OrbTapHint from "@/components/ai-agents-demo/OrbTapHint";
import QuickActions from "@/components/ai-agents-demo/QuickActions";
import { useFirstVisit } from "@/components/ai-agents-demo/useFirstVisit";
import { BrandBadge, Headline, TrustStrip } from "@/components/ai-agents-demo/DemoOverlay";
import type { OrbState } from "@/components/ai-orb/ApexHeroOrb";

export default function AiAgentsDemo() {
  const [chatOpen, setChatOpen] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [isFirstVisit, markTourSeen] = useFirstVisit();
  const [ctaPulse, setCtaPulse] = useState(false);

  const dismissTour = () => {
    markTourSeen();
    setCtaPulse(true);
  };

  const handleCoreTap = () => {
    setChatOpen((o) => !o);
    dismissTour();
  };

  return (
    <main
      id="main"
      className="demo-entrance"
      style={{ background: "#04080f", color: "#f0ede8", position: "relative", overflow: "hidden" }}
    >
      {/* Top-left overview HUD: clock + weather + social links */}
      <ApexOverviewPanel />

      {/* Brand + conversion CTA, headline, and the bottom trust strip — what
          makes this a RaveSoft product demo, not just a tech showcase. */}
      <BrandBadge ctaPulse={ctaPulse} />
      <Headline />
      <TrustStrip />
      <ActivityFeed />

      {/* The world: orb core + orbiting agent graph. Tapping the core opens a
          real chat with Ama — the same AI backend the main site uses — and
          drives the orb's thinking/speaking states from the actual reply. */}
      <section style={{ position: "relative", height: "100vh", minHeight: 620 }}>
        <ApexWorld state={orbState} onCoreTap={handleCoreTap} />
        <OrbTapHint show={isFirstVisit} onDismiss={dismissTour} />
      </section>

      <AmaChatPanel open={chatOpen} onClose={() => setChatOpen(false)} onStateChange={setOrbState} />
      <QuickActions hidden={chatOpen} />
    </main>
  );
}
