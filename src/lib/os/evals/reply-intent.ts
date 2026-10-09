import type { ReplyIntent } from "../reply-intent";

/** Labelled replies used to compare models. Deliberately includes Pidgin, short answers and tricky "not now" cases. */
export const REPLY_DATASET: Array<{ text: string; label: ReplyIntent }> = [
  { text: "Yes please, call me Tuesday morning. 0244 123 456", label: "INTERESTED" },
  { text: "This looks interesting. Can you send the pricing and book a demo for next week?", label: "INTERESTED" },
  { text: "We are listening, abeg send me the details make I see.", label: "INTERESTED" },
  { text: "Okay, let's proceed. How do I pay?", label: "INTERESTED" },
  { text: "How does it handle appointments when the clinic has three branches?", label: "QUESTION" },
  { text: "Does it work on WhatsApp and what is the setup time?", label: "QUESTION" },
  { text: "Is the price per month or per year? And can it speak Twi?", label: "QUESTION" },
  { text: "Thanks but we already use a system for this. Not needed.", label: "NOT_INTERESTED" },
  { text: "Not now, maybe next year.", label: "NOT_INTERESTED" },
  { text: "You have the wrong person, I don't handle this.", label: "NOT_INTERESTED" },
  { text: "We are not looking at any new software at this time.", label: "NOT_INTERESTED" },
  { text: "Please remove me from your list.", label: "UNSUBSCRIBE" },
  { text: "Stop sending me these emails.", label: "UNSUBSCRIBE" },
  { text: "Abeg no send me message again.", label: "UNSUBSCRIBE" },
  { text: "Je ne souhaite plus recevoir vos messages.", label: "UNSUBSCRIBE" },
  { text: "I am out of the office until Monday 14th with limited access to email. For urgent matters contact my colleague.", label: "OUT_OF_OFFICE" },
  { text: "Automatic reply: I am on annual leave and will respond when I return.", label: "OUT_OF_OFFICE" },
  { text: "Thank you.", label: "OTHER" },
  { text: "Received.", label: "OTHER" },
  { text: "👍", label: "OTHER" },
];
