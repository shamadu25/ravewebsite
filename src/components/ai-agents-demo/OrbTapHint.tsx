"use client";

/**
 * A one-time (per browser) cue drawing the eye to the orb on first visit —
 * the persistent hint text baked into the graph itself (OrbStatusBar) is
 * small and low-opacity by design, easy to miss on a busy first frame.
 */

import { useEffect, useState } from "react";

const ACCENT = "#00e5ff";
const AUTO_DISMISS_MS = 7000;

export default function OrbTapHint({ show, onDismiss }: { show: boolean; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    const showTimer = setTimeout(() => setVisible(true), 1400);
    const hideTimer = setTimeout(onDismiss, 1400 + AUTO_DISMISS_MS);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show || !visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute", left: "50%", top: "50%", zIndex: 6, pointerEvents: "none",
        width: "min(340px, 36vw)", height: "min(340px, 36vw)", transform: "translate(-50%, -50%)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <span className="orb-tap-hint-ring" style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: `1.5px solid ${ACCENT}`, opacity: 0.7,
      }} />
      <span style={{
        position: "absolute", top: "100%", marginTop: 14, whiteSpace: "nowrap",
        fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 12.5, fontWeight: 600,
        color: "#f0ede8", background: "rgba(4,8,15,0.7)", padding: "6px 14px", borderRadius: 20,
        border: `1px solid ${ACCENT}44`, backdropFilter: "blur(6px)",
      }}>
        👆 Tap to talk to the real Ama
      </span>
    </div>
  );
}
