"use client";

/**
 * Two small floating actions in the corner the chat panel occupies when
 * open — hidden then, since that's the same real estate. FAQ answers reuse
 * the site's own approved /ai-employee copy verbatim (no invented claims);
 * Share falls back to clipboard where the Web Share API isn't available.
 */

import { useState } from "react";
import { HelpCircle, Share2, X, Check } from "lucide-react";
import { trackEvent } from "@/lib/utils";

const ACCENT = "#00e5ff";

const FAQ_ITEMS = [
  {
    q: "Is this different from a normal chatbot?",
    a: "Yes. A chatbot answers scripted questions. An AI Employee qualifies leads, remembers context across a conversation, captures contact details, and performs approved actions like booking or sending reminders — with a human able to take over at any point.",
  },
  {
    q: "How is the AI trained on our business?",
    a: "During implementation, we load your approved business information — services, pricing rules, FAQs and workflow — so the agent answers from your actual business, not assumptions.",
  },
  {
    q: "What happens when it doesn't know the answer?",
    a: "It says so honestly and offers to connect the customer with a human, instead of guessing.",
  },
  {
    q: "How long does implementation take?",
    a: "Depends on scope. A single workflow (e.g. WhatsApp sales replies) can launch quickly; multi-channel or multi-integration projects take longer. We give a clear timeline after the discovery conversation.",
  },
];

function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40,
        borderRadius: "50%", background: "rgba(4,8,15,0.6)", border: `1px solid ${ACCENT}33`,
        color: "rgba(240,237,232,0.85)", cursor: "pointer", backdropFilter: "blur(8px)",
      }}
    >
      {children}
    </button>
  );
}

export default function QuickActions({ hidden }: { hidden: boolean }) {
  const [faqOpen, setFaqOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: "Meet Ama — RaveSoft's AI Employee",
      text: "This is a live, interactive demo of Ama, RaveSoft's AI employee — worth a look.",
      url: window.location.href,
    };
    trackEvent("ai_agents_demo_share_clicked", {});
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // clipboard unavailable — nothing more we can do silently
    }
  };

  if (hidden) return null;

  return (
    <div style={{
      position: "fixed", right: "clamp(12px, 3vw, 32px)", bottom: "clamp(12px, 3vh, 32px)", zIndex: 60,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {faqOpen && (
        <div style={{
          width: "min(320px, 88vw)", maxHeight: "min(420px, 60vh)", overflowY: "auto",
          background: "rgba(4,3,12,0.95)", border: `1px solid ${ACCENT}33`, borderRadius: 16,
          boxShadow: `0 0 60px ${ACCENT}1a, 0 12px 48px rgba(0,0,0,0.65)`, backdropFilter: "blur(24px)",
          padding: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: "0.04em" }}>QUICK ANSWERS</span>
            <button
              type="button" onClick={() => setFaqOpen(false)} aria-label="Close"
              style={{ background: "none", border: "none", color: "rgba(240,237,232,0.5)", cursor: "pointer", padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FAQ_ITEMS.map((item) => (
              <div key={item.q}>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "#f0ede8", marginBottom: 4 }}>{item.q}</p>
                <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: "rgba(240,237,232,0.65)" }}>{item.a}</p>
              </div>
            ))}
          </div>
          <a
            href="/ai-employee#faq"
            style={{ display: "inline-block", marginTop: 14, fontSize: 11.5, fontWeight: 600, color: ACCENT, textDecoration: "underline" }}
          >
            More questions →
          </a>
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <IconButton onClick={handleShare} label={copied ? "Link copied" : "Share this page"}>
          {copied ? <Check size={17} /> : <Share2 size={16} />}
        </IconButton>
        <IconButton onClick={() => setFaqOpen((o) => !o)} label="Quick answers">
          {faqOpen ? <X size={17} /> : <HelpCircle size={18} />}
        </IconButton>
      </div>
    </div>
  );
}
