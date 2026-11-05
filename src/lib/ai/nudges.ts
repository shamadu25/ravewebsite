import type { ChatLang } from "./i18n";

// Proactive chat nudges: a small bubble above the launcher after the visitor has spent a little time on a
// high-intent page. Each page gets its own opener and, when clicked, its own first message to Ama.

export interface Nudge {
  /** Stable key, used to show each nudge at most once per browser session. */
  key: string;
  delayMs: number;
  text: string;
  /** Sent to Ama as the visitor's first message when they click the nudge. */
  initialMessage: string;
}

interface Rule {
  key: string;
  match: (path: string) => boolean;
  delayMs: number;
  text: Record<ChatLang, string>;
  message: Record<ChatLang, string>;
}

const has = (...parts: string[]) => (path: string) => parts.some((p) => path.includes(p));

const RULES: Rule[] = [
  {
    key: "cliqpos",
    match: has("/products/cliqpos", "cliqpos"),
    delayMs: 20_000,
    text: {
      en: "Not sure which CliqPOS setup fits your shop? Tell me what you sell and I'll suggest one.",
      fr: "Pas sûr de la configuration CliqPOS pour votre boutique ? Dites-moi ce que vous vendez et je vous conseille.",
    },
    message: {
      en: "I'm looking at CliqPOS. Which setup fits my business?",
      fr: "Je regarde CliqPOS. Quelle configuration convient à mon entreprise ?",
    },
  },
  {
    key: "hotel",
    match: has("/products/hotel", "/products/hospital", "/products/school"),
    delayMs: 25_000,
    text: {
      en: "Managing rooms, bookings or patients on paper? Ask me how teams like yours switch in days.",
      fr: "Chambres, réservations ou dossiers encore sur papier ? Demandez-moi comment on migre en quelques jours.",
    },
    message: {
      en: "I'm looking at your management software. How would it work for my property?",
      fr: "Je regarde votre logiciel de gestion. Comment fonctionnerait-il pour mon établissement ?",
    },
  },
  {
    key: "pricing",
    match: has("pricing", "/services/pos-erp", "/products/erp"),
    delayMs: 20_000,
    text: {
      en: "Want a straight answer on cost? Tell me what you need and I'll give you a realistic range.",
      fr: "Envie d'une réponse claire sur le prix ? Dites-moi votre besoin et je vous donne une fourchette réaliste.",
    },
    message: {
      en: "Can you give me a realistic price range for what I need?",
      fr: "Pouvez-vous me donner une fourchette de prix réaliste pour mon besoin ?",
    },
  },
  {
    key: "case_studies",
    match: has("/case-studies", "/portfolio"),
    delayMs: 25_000,
    text: {
      en: "Seen a project like yours? Ask me for the closest case study and what it achieved.",
      fr: "Un projet qui ressemble au vôtre ? Demandez-moi l'étude de cas la plus proche et ses résultats.",
    },
    message: {
      en: "Which of your case studies is closest to my business?",
      fr: "Laquelle de vos études de cas est la plus proche de mon entreprise ?",
    },
  },
  {
    key: "ai_employee",
    match: has("/ai-employee", "/services/business-automation"),
    delayMs: 25_000,
    text: {
      en: "Curious what an AI employee could take off your plate? I'll map it out in two questions.",
      fr: "Curieux de ce qu'un employé IA peut vous retirer des épaules ? Deux questions suffisent.",
    },
    message: {
      en: "What could an AI employee handle in my business?",
      fr: "Que pourrait gérer un employé IA dans mon entreprise ?",
    },
  },
  {
    key: "custom_software",
    match: has("/services/custom-software", "/services/saas-development", "/services/mobile-apps", "/services/website-design"),
    delayMs: 30_000,
    text: {
      en: "Planning a build? Describe it in a sentence and I'll tell you how we'd approach it and what it takes.",
      fr: "Un projet à construire ? Décrivez-le en une phrase et je vous explique notre approche.",
    },
    message: {
      en: "I have a software project in mind. How would you approach it?",
      fr: "J'ai un projet logiciel en tête. Comment l'aborderiez-vous ?",
    },
  },
  {
    key: "get_started",
    match: has("/get-started"),
    delayMs: 15_000,
    text: {
      en: "Quick question while you're here: what's the one thing you'd fix first in your business?",
      fr: "Une question rapide : quelle est la première chose que vous voudriez améliorer dans votre entreprise ?",
    },
    message: {
      en: "I'd like help working out where to start.",
      fr: "J'aimerais de l'aide pour savoir par où commencer.",
    },
  },
];

/** Pages where a nudge would be intrusive or redundant (booking, forms, legal, the AI demo, admin). */
const EXCLUDED = ["/book-consultation", "/contact", "/privacy", "/terms", "/ai-agents/demo", "/admin"];

export function nudgeForPath(path: string, lang: ChatLang): Nudge | null {
  if (!path || EXCLUDED.some((p) => path.startsWith(p))) return null;
  const rule = RULES.find((r) => r.match(path));
  if (!rule) return null;
  return { key: rule.key, delayMs: rule.delayMs, text: rule.text[lang], initialMessage: rule.message[lang] };
}
