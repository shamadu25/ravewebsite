"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface DemoMessage {
  role: "assistant" | "visitor" | "action";
  text: string;
}

const SCENARIOS: Record<string, { label: string; messages: DemoMessage[] }> = {
  sales: {
    label: "Sales Inquiry",
    messages: [
      { role: "assistant", text: "Hi! Thanks for reaching out — what are you looking to get done?" },
      { role: "visitor", text: "I need a system to manage my retail shop's inventory and sales." },
      { role: "assistant", text: "Got it. How many branches are you running, and are you using any system today?" },
      { role: "visitor", text: "Two branches, currently tracking on spreadsheets." },
      {
        role: "assistant",
        text: "That's exactly the kind of setup CliqPOS handles well — real-time stock across both branches. Want me to book you a short demo this week?",
      },
      { role: "action", text: "Meeting booked · Follow-up scheduled for 2 days if no response" },
    ],
  },
  support: {
    label: "Customer Support",
    messages: [
      { role: "visitor", text: "Is my order from last week still on the way?" },
      { role: "assistant", text: "Let me check that for you — could you share your order number or the phone number used?" },
      { role: "visitor", text: "0501234567" },
      { role: "assistant", text: "Found it — it's out for delivery and should arrive today. Anything else I can help with?" },
      { role: "action", text: "Conversation logged · No human escalation needed" },
    ],
  },
  appointments: {
    label: "Appointment Booking",
    messages: [
      { role: "visitor", text: "Can I book a consultation for next week?" },
      { role: "assistant", text: "Sure — what day and time works best for you?" },
      { role: "visitor", text: "Tuesday afternoon if possible." },
      { role: "assistant", text: "Tuesday at 2:00pm is open. I've booked it and sent a confirmation — a reminder will go out the day before." },
      { role: "action", text: "Appointment booked · Reminder scheduled" },
    ],
  },
  payments: {
    label: "Payment Reminder",
    messages: [
      { role: "assistant", text: "Hi Kwame, this is a friendly reminder that Invoice #1042 (GH₵1,200) is now 5 days overdue." },
      { role: "visitor", text: "Sorry about that, I can pay by Friday." },
      { role: "assistant", text: "No problem — I've noted Friday as your payment date and will follow up then if needed. Thank you!" },
      { role: "action", text: "Payment promise logged · Follow-up scheduled for Friday" },
    ],
  },
};

export default function LiveDemoSelector() {
  const [active, setActive] = useState<keyof typeof SCENARIOS>("sales");
  const scenario = SCENARIOS[active];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Example conversation type">
        {Object.entries(SCENARIOS).map(([key, s]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            onClick={() => setActive(key as keyof typeof SCENARIOS)}
            className={cn(
              "min-h-[44px] px-4 py-2 rounded-full text-sm font-semibold border transition-colors",
              active === key
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-[#F5F7FA] p-6 space-y-3" aria-live="polite">
        {scenario.messages.map((m, i) =>
          m.role === "action" ? (
            <div key={i} className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 inline-block">
              ✓ {m.text}
            </div>
          ) : (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "assistant" ? "bg-white border border-gray-200 text-gray-800 mr-auto" : "bg-blue-600 text-white ml-auto"
              )}
            >
              {m.text}
            </div>
          )
        )}
      </div>
      <p className="text-xs text-gray-500 mt-3">Illustrative example — your AI Employee is trained on your own business.</p>
    </div>
  );
}
