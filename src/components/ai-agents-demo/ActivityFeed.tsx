"use client";

/**
 * A ticking "live activity" card. Explicitly labeled as simulated — it exists
 * to show what Ama's day looks like at scale, not to claim these are real
 * events from a live account (that would be a false claim about the
 * business, not just a decorative flourish).
 */

import { useEffect, useState } from "react";
import "./demo-overlay.css";

const ACCENT = "#00e5ff";

const EVENTS = [
  "Replied to a website inquiry in under 8 seconds",
  "Followed up with a lead that went quiet on WhatsApp",
  "Qualified a new inbound and routed it to Sales",
  "Booked a consultation call via Calendly",
  "Answered a pricing question with the current rate card",
  "Escalated a complex request to a human teammate",
  "Sent a warm re-engagement message to a cold lead",
  "Logged a new contact into the CRM pipeline",
  "Drafted a follow-up email for the sales team to review",
  "Handled an after-hours enquiry outside business hours",
  "Flagged a data-access risk before a new integration shipped",
  "Ran a QA pass on this week's release before go-live",
  "Sized a new feature request for the product roadmap",
  "Checked production health after a deploy",
  "Onboarded a new client onto their dashboard",
  "Sourced a potential partner for a new market",
];

function useTicker(seed: number) {
  const [count, setCount] = useState(seed);
  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => c + Math.floor(1 + Math.random() * 3));
    }, 5000 + Math.random() * 4000);
    return () => clearInterval(id);
  }, []);
  return count;
}

export default function ActivityFeed() {
  const tasksToday = useTicker(212);
  const [feed, setFeed] = useState<{ id: number; text: string; age: number }[]>([]);

  useEffect(() => {
    let n = 0;
    const seedTimer = setTimeout(() => {
      setFeed([{ id: n++, text: EVENTS[Math.floor(Math.random() * EVENTS.length)], age: 0 }]);
    }, 800);

    const addTimer = setInterval(() => {
      setFeed((prev) => {
        const next = [{ id: n++, text: EVENTS[Math.floor(Math.random() * EVENTS.length)], age: 0 }, ...prev];
        return next.slice(0, 4);
      });
    }, 4500 + Math.random() * 2500);

    const ageTimer = setInterval(() => {
      setFeed((prev) => prev.map((e) => ({ ...e, age: e.age + 1 })));
    }, 1000);

    return () => { clearTimeout(seedTimer); clearInterval(addTimer); clearInterval(ageTimer); };
  }, []);

  return (
    <div
      className="demo-activity-feed"
      style={{
        position: "fixed", left: "clamp(12px, 3vw, 32px)", bottom: 64, zIndex: 25,
        width: "min(300px, 86vw)", pointerEvents: "none",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{
        background: "rgba(6,14,26,0.72)", border: `1px solid ${ACCENT}2a`, borderRadius: 12,
        backdropFilter: "blur(8px)", padding: "12px 14px",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 300, color: `${ACCENT}e6` }}>{tasksToday}</span>
          <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(240,237,232,0.55)", textTransform: "uppercase" }}>
            tasks handled today
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {feed.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11, lineHeight: 1.4, color: "rgba(240,237,232,0.7)" }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#34d399", marginTop: 5, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{e.text}</span>
              <span style={{ color: "rgba(240,237,232,0.35)", flexShrink: 0, fontSize: 9.5 }}>{e.age}s ago</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 9, color: "rgba(240,237,232,0.5)", letterSpacing: "0.02em" }}>
          Simulated activity — illustrates the volume Ama handles for clients.
        </div>
      </div>
    </div>
  );
}
