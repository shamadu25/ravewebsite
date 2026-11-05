/** @jest-environment node */
const prismaMock = {
  conversation: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}), updateMany: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
  conversionEvent: { create: jest.fn().mockResolvedValue({}) },
  contact: { create: jest.fn(), update: jest.fn() },
  message: { findMany: jest.fn(), create: jest.fn().mockResolvedValue({}) },
  visitor: { upsert: jest.fn() },
  visitorSession: { create: jest.fn().mockResolvedValue({}) },
};
jest.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
const sendTranscript = jest.fn();
jest.mock("@/lib/mail/notifications", () => ({ sendTranscriptToVisitor: (...a: unknown[]) => sendTranscript(...a) }));

import { NextRequest } from "next/server";
import { POST as feedbackPost } from "@/app/api/ai/conversations/[id]/feedback/route";
import { GET as streamGet } from "@/app/api/ai/conversations/[id]/stream/route";
import { GET as updatesGet } from "@/app/api/ai/conversations/[id]/updates/route";
import { startConversation } from "@/lib/services/conversation";

let ipCounter = 0;
const nextIp = () => `10.0.0.${++ipCounter}`;
let convCounter = 0;
const freshId = () => `chat-${++convCounter}`; // the per-chat rate limiter is global, so each test gets its own chat
const fbReq = (body: unknown) =>
  new NextRequest("http://x/api/ai/conversations/c1/feedback", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": nextIp() },
    body: JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const conv = (over: Record<string, unknown> = {}) => ({ id: 1, externalId: "c1", contactId: null, contact: null, language: "en", transcriptEmailedAt: null, ...over });

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.message.findMany.mockResolvedValue([{ role: "visitor", content: "hi", createdAt: new Date() }]);
  prismaMock.conversation.updateMany.mockResolvedValue({ count: 1 });
  sendTranscript.mockResolvedValue(true);
});

describe("POST feedback", () => {
  it("stores the rating and comment", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(conv());
    const res = await feedbackPost(fbReq({ rating: 5, comment: "  great  " }), ctx(freshId()));
    expect(res.status).toBe(200);
    expect(prismaMock.conversation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rating: 5, ratingComment: "great" }) }));
    expect(sendTranscript).not.toHaveBeenCalled();
  });

  it("rejects out-of-range ratings and bad emails", async () => {
    expect((await feedbackPost(fbReq({ rating: 6 }), ctx(freshId()))).status).toBe(422);
    expect((await feedbackPost(fbReq({ rating: 0 }), ctx(freshId()))).status).toBe(422);
    expect((await feedbackPost(fbReq({ rating: 3, email: "nope", send_transcript: true }), ctx(freshId()))).status).toBe(422);
    expect(prismaMock.conversation.update).not.toHaveBeenCalled();
  });

  it("404s for an unknown chat", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(null);
    expect((await feedbackPost(fbReq({ rating: 4 }), ctx(freshId()))).status).toBe(404);
  });

  it("emails the transcript and captures the visitor as a contact", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(conv());
    prismaMock.contact.create.mockResolvedValue({ id: 9, email: "kofi@example.com" });
    const res = await feedbackPost(fbReq({ rating: 5, email: "kofi@example.com", send_transcript: true }), ctx(freshId()));
    expect((await res.json()).transcript_sent).toBe(true);
    expect(prismaMock.contact.create).toHaveBeenCalledWith({ data: { email: "kofi@example.com", consentEmail: true } });
    expect(prismaMock.conversation.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { contactId: 9 } });
    expect(sendTranscript).toHaveBeenCalledWith("kofi@example.com", "You: hi");
  });

  it("sends to the address we already hold, not an arbitrary one", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(conv({ contactId: 4, contact: { id: 4, email: "known@example.com" } }));
    await feedbackPost(fbReq({ rating: 4, email: "someone-else@example.com", send_transcript: true }), ctx(freshId()));
    expect(sendTranscript).toHaveBeenCalledWith("known@example.com", expect.any(String));
    expect(prismaMock.contact.create).not.toHaveBeenCalled();
  });

  it("only ever sends one transcript per chat", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(conv({ transcriptEmailedAt: new Date(), contactId: 4, contact: { id: 4, email: "known@example.com" } }));
    const res = await feedbackPost(fbReq({ rating: 4, send_transcript: true }), ctx(freshId()));
    expect((await res.json()).transcript_sent).toBe(false);
    expect(sendTranscript).not.toHaveBeenCalled();
  });

  it("does not double-send when two requests race", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(conv({ contactId: 4, contact: { id: 4, email: "known@example.com" } }));
    prismaMock.conversation.updateMany.mockResolvedValue({ count: 0 }); // someone else claimed the send first
    const res = await feedbackPost(fbReq({ rating: 4, send_transcript: true }), ctx(freshId()));
    expect((await res.json()).transcript_sent).toBe(false);
    expect(sendTranscript).not.toHaveBeenCalled();
  });

  it("releases the claim when SMTP fails so the visitor can retry", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(conv({ contactId: 4, contact: { id: 4, email: "known@example.com" } }));
    sendTranscript.mockResolvedValue(false);
    const res = await feedbackPost(fbReq({ rating: 4, send_transcript: true }), ctx(freshId()));
    expect((await res.json()).transcript_sent).toBe(false);
    expect(prismaMock.conversation.update).toHaveBeenLastCalledWith({ where: { id: 1 }, data: { transcriptEmailedAt: null } });
  });
});

describe("updates + stream", () => {
  const live = (over: Record<string, unknown> = {}) => ({ id: 1, status: "human_active", agentTypingAt: new Date(), ...over });

  it("polling returns replies, typing and closed state", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(live());
    prismaMock.message.findMany.mockResolvedValue([{ id: 5, role: "agent", content: "Hello!", createdAt: new Date("2026-01-01") }]);
    const res = await updatesGet(new NextRequest("http://x/u?after=3"), ctx("poll-ok"));
    expect(await res.json()).toEqual({
      messages: [{ id: 5, role: "agent", content: "Hello!", created_at: "2026-01-01T00:00:00.000Z" }],
      human_active: true,
      agent_typing: true,
      closed: false,
    });
    expect(prismaMock.message.findMany.mock.calls[0][0].where).toMatchObject({ role: "agent", id: { gt: 3 } });
  });

  it("stream sends an SSE reply (with its id) and the chat state first", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(live({ status: "closed", agentTypingAt: null }));
    prismaMock.message.findMany.mockResolvedValue([{ id: 8, role: "agent", content: "Hi there", createdAt: new Date("2026-01-01") }]);
    const abort = new AbortController();
    const res = await streamGet(new NextRequest("http://x/s?after=2", { signal: abort.signal }), ctx("stream-ok"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (!text.includes("event: state")) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }
    abort.abort();
    await reader.cancel().catch(() => undefined);

    expect(text).toContain("retry: 3000");
    expect(text).toContain("id: 8\nevent: message");
    expect(text).toContain('"content":"Hi there"');
    expect(text).toContain('event: state\ndata: {"human_active":false,"agent_typing":false,"closed":true}');
    expect(prismaMock.message.findMany.mock.calls[0][0].where.id).toEqual({ gt: 2 });
  });

  it("stream resumes from Last-Event-ID when it is ahead of the query cursor", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(live());
    prismaMock.message.findMany.mockResolvedValue([]);
    const abort = new AbortController();
    const res = await streamGet(
      new NextRequest("http://x/s?after=2", { headers: { "last-event-id": "40" }, signal: abort.signal }),
      ctx("stream-resume")
    );
    expect(prismaMock.message.findMany.mock.calls[0][0].where.id).toEqual({ gt: 40 });
    abort.abort();
    await res.body!.cancel().catch(() => undefined);
  });

  it("stream 404s for an unknown chat and never opens a stream", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(null);
    const res = await streamGet(new NextRequest("http://x/s"), ctx("stream-missing"));
    expect(res.status).toBe(404);
  });

  it("stream is rate limited per chat", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(null);
    let last = 0;
    for (let i = 0; i < 14; i++) last = (await streamGet(new NextRequest("http://x/s"), ctx("stream-flood"))).status;
    expect(last).toBe(429);
  });
});

describe("startConversation: returning visitors + language", () => {
  const input = { visitorId: "11111111-1111-4111-8111-111111111111", currentPage: "/products/cliqpos", landingPage: "/", language: "fr-GH" };
  beforeEach(() => {
    prismaMock.visitor.upsert.mockResolvedValue({ id: 3, contactId: null });
    prismaMock.conversation.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 20, ...data }));
  });

  it("greets a new visitor in their language with the page-aware opener", async () => {
    prismaMock.conversation.findFirst.mockResolvedValue(null);
    const c = await startConversation(input);
    expect(c.language).toBe("fr-GH");
    expect(prismaMock.message.create.mock.calls[0][0].data.content).toMatch(/Quel type d'entreprise/);
  });

  it("recognises a returning visitor, reuses their contact and echoes what they asked", async () => {
    prismaMock.conversation.findFirst.mockResolvedValue({
      contact: { id: 7, firstName: "Kofi" },
      messages: [{ content: "My email is kofi@example.com" }, { content: "I need a POS for my pharmacies" }],
    });
    const c = await startConversation({ ...input, language: "en-GH" });
    expect(c.contactId).toBe(7);
    const opener = prismaMock.message.create.mock.calls[0][0].data.content as string;
    expect(opener).toContain("Welcome back, Kofi!");
    expect(opener).toContain("I need a POS for my pharmacies");
    expect(opener).not.toContain("kofi@example.com");
  });

  it("only looks at earlier real (non-demo) chats from the same visitor", async () => {
    prismaMock.conversation.findFirst.mockResolvedValue(null);
    await startConversation(input);
    const where = prismaMock.conversation.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ visitorId: 3, channel: { not: "demo" } });
    expect(where.messages).toEqual({ some: { role: "visitor" } });
  });

  it("does not treat demo chats as returning visits", async () => {
    await startConversation({ ...input, landingPage: "/ai-agents/demo", currentPage: "/ai-agents/demo" });
    expect(prismaMock.conversation.findFirst).not.toHaveBeenCalled();
  });
});
