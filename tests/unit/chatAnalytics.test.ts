import { computeChatAnalytics, firstReplyMinutes, formatMinutes, median, parseRange, type AnalyticsChat } from "@/lib/os/chatAnalytics";

const NOW = new Date("2026-06-30T12:00:00Z");
const at = (iso: string) => new Date(iso);
const chat = (over: Partial<AnalyticsChat> = {}): AnalyticsChat => ({
  createdAt: at("2026-06-29T10:00:00Z"),
  contactId: null,
  assignee: null,
  language: "en-GH",
  firstAgentReplyAt: null,
  rating: null,
  source: null,
  leads: [],
  ...over,
});
const lead = (stage = "new", booked = false, score: { totalScore: number; level: string } | null = null) => ({ stage, booked, score });

describe("median / formatting", () => {
  it("computes medians", () => {
    expect(median([])).toBeNull();
    expect(median([5])).toBe(5);
    expect(median([9, 1, 5])).toBe(5);
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });
  it("formats minutes", () => {
    expect(formatMinutes(null)).toBe("—");
    expect(formatMinutes(0.4)).toBe("<1 min");
    expect(formatMinutes(12.4)).toBe("12 min");
    expect(formatMinutes(90)).toBe("1.5 h");
    expect(formatMinutes(60 * 48)).toBe("2 d");
  });
  it("only allows known ranges", () => {
    expect(parseRange("7")).toBe(7);
    expect(parseRange(["90"])).toBe(90);
    expect(parseRange("365")).toBe(30);
    expect(parseRange(undefined)).toBe(30);
  });
  it("never reports a negative reply time", () => {
    expect(firstReplyMinutes({ createdAt: at("2026-06-29T10:05:00Z"), firstAgentReplyAt: at("2026-06-29T10:00:00Z") })).toBe(0);
    expect(firstReplyMinutes({ createdAt: at("2026-06-29T10:00:00Z"), firstAgentReplyAt: null })).toBeNull();
  });
});

describe("computeChatAnalytics", () => {
  it("handles an empty range without dividing by zero", () => {
    const a = computeChatAnalytics([], 7, NOW);
    expect(a.totalChats).toBe(0);
    expect(a.funnel.map((f) => f.count)).toEqual([0, 0, 0, 0, 0]);
    expect(a.funnel.every((f) => f.ofChats === 0 && (f.ofPrevious === null || f.ofPrevious === 0))).toBe(true);
    expect(a.response.medianMinutes).toBeNull();
    expect(a.rating.average).toBeNull();
    expect(a.daily).toHaveLength(7);
    expect(a.sources).toEqual([]);
  });

  it("builds the funnel from chats to won, with step-to-step rates", () => {
    const chats = [
      chat(), // nothing
      chat({ contactId: 1 }),
      chat({ contactId: 2, leads: [lead("new")] }),
      chat({ contactId: 3, leads: [lead("consultation_booked")] }),
      chat({ contactId: 4, leads: [lead("proposal_sent", true)] }), // booked earlier, moved on
      chat({ contactId: 5, leads: [lead("won")] }),
    ];
    const f = computeChatAnalytics(chats, 30, NOW).funnel;
    expect(f.map((s) => s.count)).toEqual([6, 5, 4, 3, 1]);
    expect(f[1]).toMatchObject({ ofChats: 83.3, ofPrevious: 83.3 });
    expect(f[2]).toMatchObject({ ofChats: 66.7, ofPrevious: 80 });
    expect(f[4]).toMatchObject({ ofChats: 16.7, ofPrevious: 33.3 });
  });

  it("measures first reply time only for chats a human answered", () => {
    const chats = [
      chat({ firstAgentReplyAt: at("2026-06-29T10:02:00Z") }), // 2 min
      chat({ firstAgentReplyAt: at("2026-06-29T10:20:00Z") }), // 20 min
      chat({ firstAgentReplyAt: at("2026-06-29T10:04:00Z") }), // 4 min
      chat(), // AI only
    ];
    const r = computeChatAnalytics(chats, 30, NOW).response;
    expect(r.measured).toBe(3);
    expect(r.medianMinutes).toBe(4);
    expect(r.avgMinutes).toBe(8.7);
    expect(r.under5Share).toBe(66.7);
    expect(r.humanShare).toBe(75);
  });

  it("summarises ratings", () => {
    const a = computeChatAnalytics([chat({ rating: 5 }), chat({ rating: 5 }), chat({ rating: 2 }), chat()], 30, NOW);
    expect(a.rating.count).toBe(3);
    expect(a.rating.average).toBe(4);
    expect(a.rating.distribution).toEqual({ 1: 0, 2: 1, 3: 0, 4: 0, 5: 2 });
    expect(a.rating.responseRate).toBe(75);
  });

  it("zero-fills a daily series and ignores chats outside the window", () => {
    const a = computeChatAnalytics([chat(), chat(), chat({ createdAt: at("2026-06-27T08:00:00Z") }), chat({ createdAt: at("2026-01-01T08:00:00Z") })], 7, NOW);
    expect(a.daily[a.daily.length - 1].date).toBe("2026-06-30");
    expect(a.daily.find((d) => d.date === "2026-06-29")?.chats).toBe(2);
    expect(a.daily.find((d) => d.date === "2026-06-27")?.chats).toBe(1);
    expect(a.daily.find((d) => d.date === "2026-06-28")?.chats).toBe(0);
    expect(a.daily.reduce((s, d) => s + d.chats, 0)).toBe(3);
  });

  it("ranks sources by customers won, then bookings, and reports lead rate", () => {
    const fb = { utmSource: "facebook", utmMedium: "paid_social", utmCampaign: "get-started-gh" };
    const chats = [
      chat({ source: fb, contactId: 1, leads: [lead("won")] }),
      chat({ source: fb, contactId: 2, leads: [lead("new")] }),
      chat({ source: fb }),
      chat({ source: fb }),
      chat({ source: { referrer: "https://www.google.com/" }, contactId: 9, leads: [lead("consultation_booked")] }),
      chat({ source: { referrer: "https://www.google.com/" } }),
      chat({ source: null }),
      chat({ source: null }),
      chat({ source: null }),
    ];
    const s = computeChatAnalytics(chats, 30, NOW).sources;
    expect(s[0]).toMatchObject({ source: "Facebook/Instagram ad · get-started-gh", chats: 4, leads: 2, won: 1, leadRate: 50 });
    expect(s[1]).toMatchObject({ source: "Google search", chats: 2, booked: 1, leads: 1 });
    expect(s[2]).toMatchObject({ source: "Direct", chats: 3, leads: 0 });
  });

  it("counts hot leads and splits owners and languages", () => {
    const chats = [
      chat({ assignee: "vera@x.com", firstAgentReplyAt: at("2026-06-29T10:10:00Z"), leads: [lead("new", false, { totalScore: 90, level: "hot" })] }),
      chat({ assignee: "vera@x.com", firstAgentReplyAt: at("2026-06-29T10:02:00Z"), leads: [lead("new", false, { totalScore: 75, level: "sales_qualified" })], language: "fr-CI" }),
      chat({ assignee: "joseph@x.com", leads: [lead("new", false, { totalScore: 20, level: "low" })], language: null }),
    ];
    const a = computeChatAnalytics(chats, 30, NOW);
    expect(a.hotLeads).toBe(2);
    expect(a.owners).toEqual([
      { owner: "vera@x.com", chats: 2, measured: 2, medianMinutes: 6 },
      { owner: "joseph@x.com", chats: 1, measured: 0, medianMinutes: null },
    ]);
    expect(a.languages).toHaveLength(3);
    expect(a.languages).toEqual(expect.arrayContaining([{ language: "French", chats: 1 }, { language: "Unknown", chats: 1 }, { language: "English / other", chats: 1 }]));
  });
});
