import { chatLang, chatStrings, openerFor, pickReturningTopic, quickActionsFor } from "@/lib/ai/i18n";
import { nudgeForPath } from "@/lib/ai/nudges";
import {
  attributionLabel,
  buildVisitorTranscript,
  formatWaiting,
  isAwaitingReply,
  parseChatFilters,
  buildConversationWhere,
  slaLevel,
  topScore,
  waitingMinutes,
} from "@/lib/os/chats";
import { CANNED_REPLIES, fillCanned } from "@/lib/os/cannedReplies";
import { isAgentTyping, parseAfter, TYPING_WINDOW_MS } from "@/lib/ai/liveUpdates";
import { buildBookingUrl } from "@/components/ai/ChatBooking";
import { buildSystemPrompt } from "@/lib/ai/guardrails/systemPrompt";

describe("language", () => {
  it("detects French from browser locales and defaults to English", () => {
    expect(chatLang("fr")).toBe("fr");
    expect(chatLang("fr-CI")).toBe("fr");
    expect(chatLang("FR_gh")).toBe("fr");
    expect(chatLang("en-GH")).toBe("en");
    expect(chatLang("frisian-x")).toBe("en");
    expect(chatLang(undefined)).toBe("en");
  });

  it("has a French string for every English string", () => {
    const en = chatStrings("en");
    const fr = chatStrings("fr");
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(fr[key]).toBeTruthy();
    }
    expect(fr.placeholder).not.toBe(en.placeholder);
  });

  it("serves French quick actions to French visitors", () => {
    expect(quickActionsFor("fr-FR")[0].label).toBe("Plus de ventes");
    expect(quickActionsFor("en-US")[0].label).toBe("Get More Sales");
    expect(quickActionsFor("fr").length).toBe(quickActionsFor("en").length);
  });

  it("tells the AI to follow the visitor's language", () => {
    const prompt = buildSystemPrompt("Base", "", { language: "fr-GH" });
    expect(prompt).toContain("browser_language: fr-GH");
    expect(prompt).toMatch(/reply in the language the visitor is writing in/i);
  });
});

describe("returning visitors", () => {
  it("greets by name and echoes the earlier topic", () => {
    const text = openerFor({ lang: "en", assistantName: "Ama", returning: { firstName: "Kofi", topic: "I want to automate WhatsApp inquiries." } });
    expect(text).toContain("Welcome back, Kofi!");
    expect(text).toContain("automate WhatsApp inquiries");
  });

  it("works without a name or topic, and in French", () => {
    expect(openerFor({ lang: "en", assistantName: "Ama", returning: {} })).toMatch(/^Welcome back!/);
    expect(openerFor({ lang: "fr", assistantName: "Ama", returning: { firstName: "Awa", topic: "un POS" } })).toContain("Bon retour, Awa !");
  });

  it("uses the page-aware opener for first-time visitors", () => {
    expect(openerFor({ lang: "en", assistantName: "Ama", currentPage: "/products/cliqpos" })).toMatch(/CliqPOS/);
    expect(openerFor({ lang: "fr", assistantName: "Ama" })).toContain("Bonjour, je suis Ama");
  });

  it("never echoes contact details or one-word replies as the topic", () => {
    expect(pickReturningTopic(["hi", "My email is kofi@example.com.", "My WhatsApp number is +233 24 123 4567.", "I need a POS for my three pharmacies"])).toBe(
      "I need a POS for my three pharmacies"
    );
    expect(pickReturningTopic(["ok", "yes"])).toBeNull();
    expect(pickReturningTopic(["x".repeat(200)])?.length).toBeLessThanOrEqual(90);
  });
});

describe("proactive nudges", () => {
  it("returns a page-specific nudge in the right language", () => {
    const en = nudgeForPath("/products/cliqpos", "en");
    const fr = nudgeForPath("/products/cliqpos", "fr");
    expect(en?.key).toBe("cliqpos");
    expect(en?.text).toMatch(/CliqPOS/);
    expect(fr?.text).not.toBe(en?.text);
    expect(nudgeForPath("/case-studies/foo", "en")?.key).toBe("case_studies");
    expect(nudgeForPath("/get-started", "en")?.delayMs).toBeLessThan(20_000);
  });

  it("stays quiet where a bubble would be intrusive or irrelevant", () => {
    for (const path of ["/", "/book-consultation", "/contact", "/privacy", "/terms", "/ai-agents/demo/x", "/admin/leads", "/about"]) {
      expect(nudgeForPath(path, "en")).toBeNull();
    }
  });

  it("every nudge waits 15-30 seconds", () => {
    for (const path of ["/products/cliqpos", "/products/hotel", "/services/pos-erp", "/case-studies", "/ai-employee", "/services/custom-software", "/get-started"]) {
      const n = nudgeForPath(path, "en");
      expect(n).not.toBeNull();
      expect(n!.delayMs).toBeGreaterThanOrEqual(15_000);
      expect(n!.delayMs).toBeLessThanOrEqual(30_000);
    }
  });
});

describe("SLA timer", () => {
  it("escalates ok → warn → breach", () => {
    expect(slaLevel(0)).toBe("ok");
    expect(slaLevel(4)).toBe("ok");
    expect(slaLevel(5)).toBe("warn");
    expect(slaLevel(14)).toBe("warn");
    expect(slaLevel(15)).toBe("breach");
  });

  it("measures and formats waiting time", () => {
    const now = Date.now();
    expect(waitingMinutes(new Date(now - 7 * 60_000 - 5_000), now)).toBe(7);
    expect(waitingMinutes(null, now)).toBe(0);
    expect(waitingMinutes(new Date(now + 60_000), now)).toBe(0);
    expect(formatWaiting(0)).toBe("just now");
    expect(formatWaiting(42)).toBe("42 min");
    expect(formatWaiting(135)).toBe("2h 15m");
    expect(formatWaiting(60 * 49)).toBe("2d");
  });

  it("a handed-off chat is awaiting even if the last message is the AI's", () => {
    expect(isAwaitingReply({ status: "human_handoff", lastRole: "assistant" })).toBe(true);
    expect(isAwaitingReply({ status: "human_active", lastRole: "agent" })).toBe(false);
  });
});

describe("attribution", () => {
  it("labels paid Facebook/Instagram traffic with the campaign", () => {
    expect(attributionLabel({ utmSource: "facebook", utmMedium: "paid_social", utmCampaign: "get-started-gh" })).toBe("Facebook/Instagram ad · get-started-gh");
    expect(attributionLabel({ utmSource: "ig", utmMedium: "cpc" })).toBe("Facebook/Instagram ad");
    expect(attributionLabel({ utmSource: "meta" })).toBe("Facebook/Instagram ad");
  });

  it("labels other sources and referrers", () => {
    expect(attributionLabel({ utmSource: "google", utmMedium: "cpc" })).toBe("Google ad");
    expect(attributionLabel({ utmSource: "newsletter", utmMedium: "email" })).toBe("Email");
    expect(attributionLabel({ referrer: "https://www.google.com/search?q=x" })).toBe("Google search");
    expect(attributionLabel({ referrer: "https://l.facebook.com/" })).toBe("Facebook/Instagram");
    expect(attributionLabel({ referrer: "https://blog.example.org/post" })).toBe("Referral · blog.example.org");
    expect(attributionLabel({ referrer: "not a url" })).toBe("Direct");
    expect(attributionLabel(null)).toBe("Direct");
    expect(attributionLabel({})).toBe("Direct");
  });
});

describe("lead score + inbox filters", () => {
  it("picks the highest score", () => {
    expect(topScore([{ scores: [{ totalScore: 40, level: "nurture" }] }, { scores: [{ totalScore: 88, level: "hot" }] }])).toEqual({ score: 88, level: "hot" });
    expect(topScore([{ scores: [] }])).toBeNull();
    expect(topScore(undefined)).toBeNull();
  });

  it("parses sort and the unassigned view", () => {
    expect(parseChatFilters({ sort: "score" }).sort).toBe("score");
    expect(parseChatFilters({ sort: "nonsense" }).sort).toBe("recent");
    expect(parseChatFilters({ view: "unassigned" }).view).toBe("unassigned");
    const where = buildConversationWhere(parseChatFilters({ view: "unassigned" }));
    expect(JSON.stringify(where)).toContain('"assignee":null');
    expect(JSON.stringify(where)).toContain('"status":{"not":"closed"}');
  });
});

describe("canned replies", () => {
  it("fills the visitor's first name, or removes the placeholder", () => {
    expect(fillCanned("Happy to help{name}.", "Kofi")).toBe("Happy to help, Kofi.");
    expect(fillCanned("Happy to help{name}.", null)).toBe("Happy to help.");
    expect(fillCanned("{name}{name}", " Ama ")).toBe(", Ama, Ama");
  });

  it("ships unique, non-empty replies", () => {
    expect(new Set(CANNED_REPLIES.map((c) => c.key)).size).toBe(CANNED_REPLIES.length);
    for (const c of CANNED_REPLIES) {
      expect(c.title.length).toBeGreaterThan(3);
      expect(c.body.length).toBeGreaterThan(20);
      expect(c.body.length).toBeLessThan(4000);
    }
  });
});

describe("live updates helpers", () => {
  it("treats a fresh ping as typing and a stale one as not", () => {
    const now = Date.now();
    expect(isAgentTyping(new Date(now - 1_000), now)).toBe(true);
    expect(isAgentTyping(new Date(now - TYPING_WINDOW_MS - 1), now)).toBe(false);
    expect(isAgentTyping(null, now)).toBe(false);
  });

  it("parses the resume cursor defensively", () => {
    expect(parseAfter("42")).toBe(42);
    expect(parseAfter("-3")).toBe(0);
    expect(parseAfter("abc")).toBe(0);
    expect(parseAfter("1.5")).toBe(0);
    expect(parseAfter(null)).toBe(0);
  });
});

describe("transcript + booking url", () => {
  it("builds a visitor-facing transcript without internal ids", () => {
    const text = buildVisitorTranscript(
      [
        { role: "assistant", content: "Hi", createdAt: new Date() },
        { role: "visitor", content: "Hello", createdAt: new Date() },
        { role: "agent", content: "Welcome", createdAt: new Date() },
      ],
      "en"
    );
    expect(text).toBe("Ama (AI assistant): Hi\n\nYou: Hello\n\nRaveSoft team: Welcome");
    expect(buildVisitorTranscript([{ role: "visitor", content: "Salut", createdAt: new Date() }], "fr")).toBe("Vous: Salut");
  });

  it("pre-fills Calendly with what we know and tags the source", () => {
    const url = new URL(buildBookingUrl({ name: " Kofi Mensah ", email: "kofi@example.com", conversationId: "abc", host: "ravesoftsolutions.com" }));
    expect(url.origin + url.pathname).toBe("https://calendly.com/ravesoftsolutions23");
    expect(url.searchParams.get("name")).toBe("Kofi Mensah");
    expect(url.searchParams.get("email")).toBe("kofi@example.com");
    expect(url.searchParams.get("utm_source")).toBe("website_chat");
    expect(url.searchParams.get("utm_campaign")).toBe("abc");
    const bare = new URL(buildBookingUrl({}));
    expect(bare.searchParams.has("email")).toBe(false);
  });
});
