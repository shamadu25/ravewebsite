// One-click replies for the admin chat inbox. `{name}` is replaced with the visitor's first name
// (or removed) when a reply is inserted. Edit the wording here; no database change needed.

export interface CannedReply {
  key: string;
  title: string;
  body: string;
}

export const CANNED_REPLIES: CannedReply[] = [
  {
    key: "greeting",
    title: "Greeting — team has joined",
    body: "Hi{name}, this is the RaveSoft team. I've read your messages and I'm taking over from Ama. How can I help?",
  },
  {
    key: "demo",
    title: "Book a demo / consultation",
    body: "Happy to walk you through it{name}. The quickest way is a 20-minute call — pick any time that suits you here: https://calendly.com/ravesoftsolutions23 — and tell me what you'd like to see.",
  },
  {
    key: "pricing",
    title: "Pricing — ask what they need",
    body: "Pricing depends on your setup{name}. To give you a precise quote, how many locations/users do you have, and do you need anything custom (integrations, branded app, training)?",
  },
  {
    key: "cliqpos",
    title: "CliqPOS — qualify",
    body: "CliqPOS fits retail, restaurants and pharmacies well{name}. What do you sell, how many outlets, and are you using a POS or paper/Excel today?",
  },
  {
    key: "whatsapp",
    title: "Move to WhatsApp",
    body: "Easier to continue on WhatsApp{name}? Message us there and we'll pick up with full context: https://wa.me/233531561484",
  },
  {
    key: "contact",
    title: "Ask for contact details",
    body: "So I can send the details over{name}, what's the best email or WhatsApp number to reach you on?",
  },
  {
    key: "followup",
    title: "Follow-up promise",
    body: "Thanks{name} — I'll prepare this and get back to you within the hour. If anything changes, just reply here.",
  },
  {
    key: "support",
    title: "Existing customer — support",
    body: "Sorry you're having trouble{name}. Can you share your business name and a screenshot or short description of what's happening? I'll get it to our support team straight away.",
  },
];

/** Fills `{name}` with ", Kofi" (or nothing) so replies read naturally with or without a known name. */
export function fillCanned(body: string, firstName?: string | null): string {
  const n = firstName?.trim();
  return body.replace(/\{name\}/g, n ? `, ${n}` : "");
}
