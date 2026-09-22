import ApexWorld from "@/components/ai-orb/ApexWorld";
import ApexOverviewPanel from "@/components/ai-orb/ApexOverviewPanel";

export default function AiOrbShowcase() {
  return (
    <main
      id="main"
      style={{ background: "#04080f", color: "#f0ede8", position: "relative", overflow: "hidden" }}
    >
      {/* Top-left overview HUD: clock + weather + social links */}
      <ApexOverviewPanel />

      {/* The world: orb core + orbiting agent graph. Tap the orb to cycle its
          state; click any agent node to open its overview card. */}
      <section style={{ position: "relative", height: "100vh", minHeight: 620 }}>
        <ApexWorld />
      </section>
    </main>
  );
}
