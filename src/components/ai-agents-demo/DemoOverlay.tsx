"use client";

/**
 * Everything that makes this page read as a RaveSoft product demo rather
 * than a standalone tech showcase: the brand badge, the headline, the
 * conversion CTA, and the trust strip (real stats only — no fabricated
 * certifications or client logos).
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import "./demo-overlay.css";

const ACCENT = "#00e5ff";

const ZONES: { city: string; tz: string }[] = [
  { city: "Accra", tz: "Africa/Accra" },
  { city: "London", tz: "Europe/London" },
  { city: "Dubai", tz: "Asia/Dubai" },
  { city: "New York", tz: "America/New_York" },
];

// `now` stays null until mounted (avoids a server/client render mismatch on
// the current time); the effect seeds it once and then ticks it every 30s.
function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with the system clock, not derived render state
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function BrandBadge() {
  return (
    <div style={{
      position: "fixed", top: 14, right: "clamp(12px, 3vw, 32px)", zIndex: 40,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <Link
        href="/"
        aria-label="RaveSoft Digital Solutions — home"
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 8px",
          background: "rgba(4,8,15,0.6)", border: `1px solid ${ACCENT}2a`, borderRadius: 20,
          backdropFilter: "blur(8px)", textDecoration: "none",
        }}
      >
        <span style={{ background: "#fff", borderRadius: 8, padding: "3px 6px", display: "flex" }}>
          <Image src="/img/logo.png" alt="" width={80} height={48} style={{ height: 16, width: "auto" }} />
        </span>
        <span style={{ fontSize: 10.5, letterSpacing: "0.08em", color: "rgba(240,237,232,0.8)", textTransform: "uppercase" }}>
          RaveSoft Digital Solutions
        </span>
      </Link>

      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
        background: "rgba(4,8,15,0.5)", border: `1px solid ${ACCENT}22`, borderRadius: 20,
        backdropFilter: "blur(8px)",
      }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399", flexShrink: 0 }} />
        <span style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "rgba(240,237,232,0.6)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
          27 agents online
        </span>
      </div>

      <a
        href="/book-consultation"
        style={{
          display: "flex", alignItems: "center", gap: 7, padding: "9px 16px",
          background: ACCENT, color: "#04080f", borderRadius: 20, textDecoration: "none",
          fontSize: 12, fontWeight: 700, letterSpacing: "0.02em",
          boxShadow: `0 4px 20px ${ACCENT}44`,
        }}
      >
        <CalendarCheck size={14} />
        Book a live demo
      </a>
    </div>
  );
}

export function Headline() {
  return (
    <div
      className="demo-headline"
      style={{
        position: "fixed", left: "50%", transform: "translateX(-50%)", zIndex: 20,
        width: "min(560px, 88vw)", textAlign: "center", pointerEvents: "none",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1 style={{
        margin: 0, fontSize: "clamp(15px, 2vw, 20px)", fontWeight: 300, color: "#f0ede8", letterSpacing: "0.01em",
        textShadow: "0 2px 16px rgba(4,8,15,0.9), 0 0 4px rgba(4,8,15,0.9)",
      }}>
        Meet <span style={{ color: ACCENT, fontWeight: 600 }}>Ama</span> — RaveSoft&apos;s AI Employee, and the full company she runs with
      </h1>
    </div>
  );
}

export function TrustStrip() {
  const now = useClock();

  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 35, pointerEvents: "none",
      background: "linear-gradient(0deg, rgba(4,8,15,0.85) 0%, rgba(4,8,15,0) 100%)",
      paddingTop: 24,
    }}>
      <div
        className="demo-trust-strip"
        style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center",
          gap: "8px 24px", padding: "10px 16px 12px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "rgba(240,237,232,0.5)", letterSpacing: "0.02em",
        }}
      >
        <span style={{ flexShrink: 0 }}>500+ businesses run on RaveSoft-built software</span>
        <span className="demo-trust-secondary" style={{ opacity: 0.3, flexShrink: 0 }}>·</span>
        <span className="demo-trust-secondary" style={{ flexShrink: 0 }}>Data encrypted in transit &amp; at rest</span>
        <span className="demo-trust-secondary" style={{ opacity: 0.3, flexShrink: 0 }}>·</span>
        <span className="demo-trust-secondary" style={{ flexShrink: 0 }}>Always-on monitoring, human escalation when it matters</span>
        <span style={{ opacity: 0.3, flexShrink: 0 }}>·</span>
        <span style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          {ZONES.map((z) => (
            <span key={z.city}>
              {z.city}{" "}
              <strong style={{ color: "rgba(240,237,232,0.75)", fontWeight: 500 }}>
                {now
                  ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: z.tz }).format(now)
                  : "--:--"}
              </strong>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
