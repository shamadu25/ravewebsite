import { QUICK_ACTIONS } from "./config";

// Chat language support. The AI itself answers in whatever language the visitor writes (English,
// French, Pidgin, …); this module localises the fixed copy around it: widget UI, openers, quick actions.

export type ChatLang = "en" | "fr";

/** "fr", "fr-GH", "FR_ci" → "fr". Everything else (including missing) → "en". */
export function chatLang(language?: string | null): ChatLang {
  return /^fr([-_]|$)/i.test((language ?? "").trim()) ? "fr" : "en";
}

export interface ChatStrings {
  online: string;
  connecting: string;
  typing: string;
  teamTyping: string;
  teamOnChat: string;
  placeholder: string;
  messageLabel: string;
  send: string;
  closeChat: string;
  endChat: string;
  teamLabel: string;
  unavailable: string;
  continueWhatsApp: string;
  exitTitle: string;
  exitBody: string;
  emailPlaceholder: string;
  whatsappPlaceholder: string;
  exitSend: string;
  exitSending: string;
  exitDismiss: string;
  bookTitle: string;
  bookButton: string;
  bookHide: string;
  booked: string;
  feedbackTitle: string;
  feedbackHelp: string;
  feedbackComment: string;
  feedbackEmail: string;
  feedbackSendTranscript: string;
  feedbackSubmit: string;
  feedbackThanks: string;
  feedbackTranscriptSent: string;
  feedbackError: string;
  nudgeDismiss: string;
}

const EN: ChatStrings = {
  online: "Online now",
  connecting: "Connecting…",
  typing: "Typing…",
  teamTyping: "RaveSoft team is typing…",
  teamOnChat: "A RaveSoft team member is on this chat — their reply will appear here.",
  placeholder: "Type your message…",
  messageLabel: "Message",
  send: "Send message",
  closeChat: "Close chat",
  endChat: "End chat",
  teamLabel: "RaveSoft team",
  unavailable:
    "Our AI assistant is temporarily unavailable. Leave a message on WhatsApp and the RaveSoft team will get back to you.",
  continueWhatsApp: "Continue on WhatsApp →",
  exitTitle: "Before you go — want us to follow up?",
  exitBody: "Leave your email or WhatsApp number and we'll reach out with more detail. No obligation.",
  emailPlaceholder: "Email address",
  whatsappPlaceholder: "or WhatsApp number",
  exitSend: "Send",
  exitSending: "Sending…",
  exitDismiss: "No thanks",
  bookTitle: "Pick a time that suits you",
  bookButton: "Book a call",
  bookHide: "Hide calendar",
  booked: "You're booked — check your email for the invite.",
  feedbackTitle: "How was this chat?",
  feedbackHelp: "Your feedback helps us improve.",
  feedbackComment: "Anything we could do better? (optional)",
  feedbackEmail: "Email me this transcript",
  feedbackSendTranscript: "Send me the transcript",
  feedbackSubmit: "Submit",
  feedbackThanks: "Thank you for your feedback!",
  feedbackTranscriptSent: "Thank you! The transcript is on its way to your inbox.",
  feedbackError: "Could not save your feedback. Please try again.",
  nudgeDismiss: "Dismiss",
};

const FR: ChatStrings = {
  online: "En ligne",
  connecting: "Connexion…",
  typing: "Rédaction…",
  teamTyping: "L'équipe RaveSoft est en train d'écrire…",
  teamOnChat: "Un membre de l'équipe RaveSoft est sur ce chat — sa réponse apparaîtra ici.",
  placeholder: "Écrivez votre message…",
  messageLabel: "Message",
  send: "Envoyer le message",
  closeChat: "Fermer le chat",
  endChat: "Terminer le chat",
  teamLabel: "Équipe RaveSoft",
  unavailable:
    "Notre assistant IA est momentanément indisponible. Laissez un message sur WhatsApp et l'équipe RaveSoft vous répondra.",
  continueWhatsApp: "Continuer sur WhatsApp →",
  exitTitle: "Avant de partir — voulez-vous qu'on vous recontacte ?",
  exitBody: "Laissez votre e-mail ou votre numéro WhatsApp et nous vous donnerons plus de détails. Sans engagement.",
  emailPlaceholder: "Adresse e-mail",
  whatsappPlaceholder: "ou numéro WhatsApp",
  exitSend: "Envoyer",
  exitSending: "Envoi…",
  exitDismiss: "Non merci",
  bookTitle: "Choisissez un créneau qui vous convient",
  bookButton: "Réserver un appel",
  bookHide: "Masquer le calendrier",
  booked: "C'est réservé — vérifiez votre e-mail pour l'invitation.",
  feedbackTitle: "Comment s'est passé ce chat ?",
  feedbackHelp: "Votre avis nous aide à nous améliorer.",
  feedbackComment: "Que pourrions-nous améliorer ? (facultatif)",
  feedbackEmail: "M'envoyer cette conversation par e-mail",
  feedbackSendTranscript: "M'envoyer la transcription",
  feedbackSubmit: "Envoyer",
  feedbackThanks: "Merci pour votre avis !",
  feedbackTranscriptSent: "Merci ! La transcription arrive dans votre boîte mail.",
  feedbackError: "Impossible d'enregistrer votre avis. Veuillez réessayer.",
  nudgeDismiss: "Fermer",
};

export function chatStrings(lang: ChatLang): ChatStrings {
  return lang === "fr" ? FR : EN;
}

export const QUICK_ACTIONS_FR: Array<{ label: string; message: string }> = [
  { label: "Plus de ventes", message: "Je veux augmenter les ventes de mon entreprise." },
  { label: "Automatiser WhatsApp", message: "Je veux automatiser les demandes reçues sur WhatsApp." },
  { label: "Un employé IA", message: "Je veux un employé IA pour mon entreprise." },
  { label: "Automatiser le service client", message: "Je veux automatiser mon service client." },
  { label: "Logiciel sur mesure", message: "J'ai besoin d'un logiciel sur mesure." },
  { label: "CliqPOS", message: "Parlez-moi de CliqPOS." },
  { label: "Logiciel hôtelier", message: "Parlez-moi de votre logiciel de gestion hôtelière." },
  { label: "Parler à RaveSoft", message: "Je voudrais parler à quelqu'un chez RaveSoft." },
  { label: "J'ai besoin d'aide", message: "Je suis déjà client et j'ai besoin d'aide." },
];

/** Page-aware chat opener. `previousTopic` (a returning visitor's earlier question) wins over the page. */
export function openerFor(opts: {
  lang: ChatLang;
  assistantName: string;
  currentPage?: string | null;
  returning?: { firstName?: string | null; topic?: string | null } | null;
}): string {
  const { lang, assistantName, currentPage, returning } = opts;

  if (returning) {
    const name = returning.firstName?.trim();
    const topic = returning.topic?.trim();
    if (lang === "fr") {
      const hello = name ? `Bon retour, ${name} !` : "Bon retour !";
      return topic
        ? `${hello} La dernière fois, vous nous parliez de : « ${topic} ». On reprend là où on s'était arrêtés, ou avez-vous une autre priorité aujourd'hui ?`
        : `${hello} Ravie de vous revoir. Qu'est-ce qui vous amène aujourd'hui ?`;
    }
    const hello = name ? `Welcome back, ${name}!` : "Welcome back!";
    return topic
      ? `${hello} Last time you asked about: “${topic}”. Want to pick up where we left off, or is something else the priority today?`
      : `${hello} Good to see you again. What brings you back today?`;
  }

  const page = currentPage ?? "";
  if (lang === "fr") {
    if (page.includes("cliqpos")) return "Quel type d'entreprise dirigez-vous ? Je vous aiderai à trouver la configuration CliqPOS la plus adaptée.";
    if (page.includes("hotel")) return "Combien de chambres compte votre établissement ? Je peux vous orienter vers la bonne solution de gestion hôtelière.";
    if (page.includes("business-automation")) return "Vous voulez automatiser une partie de votre activité ? Je peux identifier où un employé IA vous ferait gagner le plus.";
    if (page.includes("ai-employee")) return "Quel type d'entreprise dirigez-vous, et où perdez-vous le plus de temps ou de clients : ventes, support, relances… ?";
    return `Bonjour, je suis ${assistantName} de RaveSoft. Qu'essayez-vous d'accomplir, ou qu'est-ce qui freine votre activité en ce moment ?`;
  }
  if (page.includes("cliqpos")) return "What type of business are you running? I'll help you identify the most suitable CliqPOS setup.";
  if (page.includes("hotel")) return "How many rooms does your property manage? I can help identify the right hotel management setup.";
  if (page.includes("business-automation")) return "Want to automate part of your business? I can help identify where an AI employee would produce the most value.";
  if (page.includes("ai-employee")) return "What kind of business do you run, and where are you currently losing the most time or customers — sales, support, follow-up, or something else?";
  return `Hi, I'm ${assistantName} from RaveSoft. What are you trying to get done, or what's slowing your business down right now?`;
}

export function quickActionsFor(language?: string | null): Array<{ label: string; message: string }> {
  return chatLang(language) === "fr" ? QUICK_ACTIONS_FR : QUICK_ACTIONS;
}

/** First thing the visitor asked about that is worth echoing back; skips contact details and one-word replies. */
export function pickReturningTopic(visitorMessages: string[]): string | null {
  for (const raw of visitorMessages) {
    const text = raw.replace(/\s+/g, " ").trim();
    if (text.length < 12) continue;
    if (/@/.test(text) || /\d[\d\s().+-]{6,}\d/.test(text)) continue; // email / phone: never echo contact details
    return text.length > 90 ? `${text.slice(0, 87).trimEnd()}…` : text;
  }
  return null;
}
