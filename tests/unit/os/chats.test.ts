import {
  buildConversationWhere,
  buildTranscript,
  isAwaitingReply,
  parseChatFilters,
  LEAD_STAGES,
} from "@/lib/os/chats";

describe("parseChatFilters", () => {
  it("defaults to website chats, all statuses, page 1", () => {
    expect(parseChatFilters({})).toEqual({ q: "", status: "all", view: "all", channel: "website", sort: "recent", page: 1 });
  });
  it("rejects unknown values instead of passing them to the query", () => {
    const f = parseChatFilters({ status: "x'; DROP", view: "nope", page: "-3", q: "  hi  " });
    expect(f).toMatchObject({ status: "all", view: "all", page: 1, q: "hi" });
  });
  it("accepts valid filters", () => {
    expect(parseChatFilters({ status: "human_handoff", view: "leads", channel: "all", page: "4" })).toMatchObject({
      status: "human_handoff", view: "leads", channel: "all", page: 4,
    });
  });
});

describe("buildConversationWhere", () => {
  it("excludes demo chats by default and includes them on request", () => {
    expect(JSON.stringify(buildConversationWhere(parseChatFilters({})))).toContain('"channel":{"not":"demo"}');
    expect(buildConversationWhere(parseChatFilters({ channel: "all" }))).toEqual({});
  });
  it("searches contact fields and message text", () => {
    const where = JSON.stringify(buildConversationWhere(parseChatFilters({ q: "kofi", channel: "all" })));
    expect(where).toContain("messages");
    expect(where).toContain("email");
  });
});

describe("isAwaitingReply", () => {
  it("flags handoffs and unanswered visitor messages", () => {
    expect(isAwaitingReply({ status: "human_handoff", lastRole: "assistant" })).toBe(true);
    expect(isAwaitingReply({ status: "open", lastRole: "visitor" })).toBe(true);
  });
  it("does not flag answered or closed chats", () => {
    expect(isAwaitingReply({ status: "open", lastRole: "assistant" })).toBe(false);
    expect(isAwaitingReply({ status: "closed", lastRole: "visitor" })).toBe(false);
  });
});

describe("buildTranscript", () => {
  it("contains every message in order with timestamps", () => {
    const t = buildTranscript(
      { externalId: "abc", visitor: "Ama K", contact: null, startedAt: new Date("2026-01-01T10:00:00Z"), landingPage: "/" },
      [
        { role: "assistant", content: "Hi!", createdAt: new Date("2026-01-01T10:00:01Z") },
        { role: "visitor", content: "Need a POS", createdAt: new Date("2026-01-01T10:00:09Z") },
      ]
    );
    expect(t.indexOf("Hi!")).toBeLessThan(t.indexOf("Need a POS"));
    expect(t).toContain("2026-01-01T10:00:09.000Z");
    expect(t).toContain("Visitor: Need a POS");
  });
});

it("lead stages include the ones the Calendly webhook writes", () => {
  expect(LEAD_STAGES).toEqual(expect.arrayContaining(["new", "consultation_booked", "consultation_canceled"]));
});
