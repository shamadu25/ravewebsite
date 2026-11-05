jest.mock("@/lib/formToken", () => ({ prefetchFormToken: jest.fn(), takeFormToken: jest.fn().mockResolvedValue(null) }));
const usePathname = jest.fn().mockReturnValue("/");
jest.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatWidget from "@/components/ai/ChatWidget";

type Json = Record<string, unknown>;
const ok = (body: Json) => Promise.resolve({ ok: true, json: async () => body } as Response);

const conversation = (over: Json = {}): Json => ({
  id: "conv-1",
  stage: "new",
  status: "open",
  assistant_name: "Ama",
  quick_actions: [],
  contact_captured: false,
  contact: null,
  rating: null,
  messages: [{ id: 1, role: "assistant", content: "Hi — how can I help?", created_at: null }],
  ...over,
});

/** Routes fetch calls by URL so each test only describes what differs. */
function mockApi(handlers: { updates?: () => Json; send?: () => Json; conv?: () => Json; feedback?: () => Json } = {}) {
  const fn = jest.fn((url: string, init?: RequestInit) => {
    if (url.includes("/updates")) return ok(handlers.updates?.() ?? { messages: [], human_active: false });
    if (url.includes("/feedback")) return ok(handlers.feedback?.() ?? { ok: true, transcript_sent: false });
    if (url.endsWith("/messages")) return ok(handlers.send?.() ?? { message: "ok", needs_human: false, ai_unavailable: false, cta: "continue_conversation", contact_captured: false });
    if (url.endsWith("/conversations") && init?.method === "POST") return ok(handlers.conv?.() ?? conversation());
    return ok(handlers.conv?.() ?? conversation());
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

const openChat = () => fireEvent.click(screen.getByRole("button", { name: /chat with ama/i }));
const language = (value: string) => jest.spyOn(window.navigator, "language", "get").mockReturnValue(value);

describe("ChatWidget upgrades", () => {
  const originalFetch = global.fetch;
  const originalEventSource = (global as { EventSource?: unknown }).EventSource;

  beforeEach(() => {
    usePathname.mockReturnValue("/");
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    global.fetch = originalFetch;
    (global as { EventSource?: unknown }).EventSource = originalEventSource;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  describe("language", () => {
    it("shows the interface in French for French browsers", async () => {
      language("fr-FR");
      mockApi({ conv: () => conversation({ quick_actions: [{ label: "Plus de ventes", message: "Je veux plus de ventes." }] }) });
      render(<ChatWidget />);
      openChat();
      expect(await screen.findByPlaceholderText("Écrivez votre message…")).toBeInTheDocument();
      expect(screen.getByText("En ligne")).toBeInTheDocument();
      expect(await screen.findByRole("button", { name: "Plus de ventes" })).toBeInTheDocument();
    });

    it("stays English otherwise", async () => {
      language("en-GH");
      mockApi();
      render(<ChatWidget />);
      openChat();
      expect(await screen.findByPlaceholderText("Type your message…")).toBeInTheDocument();
    });
  });

  describe("proactive nudge", () => {
    it("offers a page-specific bubble after the delay, once, and sends its message when clicked", async () => {
      jest.useFakeTimers();
      language("en-GH");
      usePathname.mockReturnValue("/products/cliqpos");
      const api = mockApi();
      render(<ChatWidget />);

      expect(screen.queryByText(/which CliqPOS setup/i)).not.toBeInTheDocument();
      act(() => void jest.advanceTimersByTime(19_000));
      expect(screen.queryByText(/which CliqPOS setup/i)).not.toBeInTheDocument();
      act(() => void jest.advanceTimersByTime(1_500));
      const bubble = screen.getByText(/which CliqPOS setup/i);
      expect(bubble).toBeInTheDocument();

      jest.useRealTimers();
      fireEvent.click(bubble);
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      expect(screen.queryByText(/which CliqPOS setup/i)).not.toBeInTheDocument();
      await waitFor(() => {
        const sent = api.mock.calls.find(([u]) => String(u).endsWith("/messages"));
        expect(sent).toBeTruthy();
        expect(JSON.parse(String(sent![1]!.body)).message).toBe("I'm looking at CliqPOS. Which setup fits my business?");
      });
    });

    it("does not show again once seen in this session, and can be dismissed", () => {
      jest.useFakeTimers();
      language("en-GH");
      usePathname.mockReturnValue("/get-started");
      mockApi();
      const first = render(<ChatWidget />);
      act(() => void jest.advanceTimersByTime(16_000));
      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
      expect(screen.queryByText(/one thing you'd fix first/i)).not.toBeInTheDocument();
      first.unmount();

      render(<ChatWidget />);
      act(() => void jest.advanceTimersByTime(60_000));
      expect(screen.queryByText(/one thing you'd fix first/i)).not.toBeInTheDocument();
    });

    it("stays quiet on pages without a nudge and never interrupts an open chat", () => {
      jest.useFakeTimers();
      language("en-GH");
      mockApi();
      render(<ChatWidget />);
      act(() => void jest.advanceTimersByTime(120_000));
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("is written in French for French visitors", () => {
      jest.useFakeTimers();
      language("fr-CI");
      usePathname.mockReturnValue("/products/cliqpos");
      mockApi();
      render(<ChatWidget />);
      act(() => void jest.advanceTimersByTime(21_000));
      expect(screen.getByText(/Pas sûr de la configuration CliqPOS/)).toBeInTheDocument();
    });
  });

  describe("team replies", () => {
    it("shows 'team is typing' and then the reply, via the polling fallback (no EventSource)", async () => {
      language("en-GH");
      delete (global as { EventSource?: unknown }).EventSource;
      let call = 0;
      mockApi({
        updates: () => {
          call += 1;
          return call === 1
            ? { messages: [], human_active: true, agent_typing: true, closed: false }
            : { messages: [{ id: 9, role: "agent", content: "Hello from the team", created_at: null }], human_active: true, agent_typing: false, closed: false };
        },
      });
      jest.useFakeTimers();
      render(<ChatWidget />);
      openChat();
      await act(async () => void (await jest.advanceTimersByTimeAsync(0)));
      await act(async () => void (await jest.advanceTimersByTimeAsync(4_100)));
      expect(screen.getByText("RaveSoft team is typing…")).toBeInTheDocument();
      await act(async () => void (await jest.advanceTimersByTimeAsync(4_100)));
      expect(screen.getByText("Hello from the team")).toBeInTheDocument();
      expect(screen.queryByText("RaveSoft team is typing…")).not.toBeInTheDocument();
    });

    it("uses Server-Sent Events when available: replies and typing arrive without polling", async () => {
      language("en-GH");
      const sources: FakeEventSource[] = [];
      class FakeEventSource {
        static CLOSED = 2;
        readyState = 1;
        onopen: (() => void) | null = null;
        onerror: (() => void) | null = null;
        listeners: Record<string, (e: MessageEvent) => void> = {};
        constructor(public url: string) {
          sources.push(this);
        }
        addEventListener(type: string, cb: (e: MessageEvent) => void) {
          this.listeners[type] = cb;
        }
        close() {
          this.readyState = 2;
        }
        emit(type: string, data: unknown) {
          this.listeners[type]({ data: JSON.stringify(data) } as MessageEvent);
        }
      }
      (global as { EventSource?: unknown }).EventSource = FakeEventSource;
      const api = mockApi();
      render(<ChatWidget />);
      openChat();
      await screen.findByText("Hi — how can I help?");
      await waitFor(() => expect(sources.length).toBe(1));
      expect(sources[0].url).toBe("/api/ai/conversations/conv-1/stream?after=0");

      act(() => sources[0].emit("state", { human_active: true, agent_typing: true, closed: false }));
      expect(screen.getByText("RaveSoft team is typing…")).toBeInTheDocument();
      act(() => sources[0].emit("message", { id: 12, role: "agent", content: "Streamed hello", created_at: null }));
      expect(screen.getByText("Streamed hello")).toBeInTheDocument();
      expect(screen.queryByText("RaveSoft team is typing…")).not.toBeInTheDocument();
      expect(api.mock.calls.some(([u]) => String(u).includes("/updates"))).toBe(false);
    });

    it("falls back to polling when the stream is closed for good", async () => {
      language("en-GH");
      class DeadEventSource {
        static CLOSED = 2;
        readyState = 2;
        onerror: (() => void) | null = null;
        constructor() {
          setTimeout(() => this.onerror?.(), 0);
        }
        addEventListener() {}
        close() {}
      }
      (global as { EventSource?: unknown }).EventSource = DeadEventSource;
      const api = mockApi({ updates: () => ({ messages: [{ id: 3, role: "agent", content: "Polled hello", created_at: null }], human_active: true, agent_typing: false, closed: false }) });
      render(<ChatWidget />);
      openChat();
      expect(await screen.findByText("Polled hello", undefined, { timeout: 6000 })).toBeInTheDocument();
      expect(api.mock.calls.some(([u]) => String(u).includes("/updates"))).toBe(true);
    }, 10_000);
  });

  describe("booking in chat", () => {
    it("shows a pick-a-time card for booking intent and opens a pre-filled calendar", async () => {
      language("en-GH");
      mockApi({
        conv: () => conversation({ contact: { first_name: "Kofi", last_name: "Mensah", email: "kofi@example.com" }, contact_captured: true }),
        send: () => ({ message: "Let's get you on a call.", needs_human: false, ai_unavailable: false, cta: "book_demo", contact_captured: true }),
      });
      render(<ChatWidget />);
      openChat();
      await screen.findByText("Hi — how can I help?");
      fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Can I get a demo?" } });
      fireEvent.click(screen.getByRole("button", { name: /send message/i }));

      expect(await screen.findByText("Pick a time that suits you")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Book a call" }));
      const frame = screen.getByTitle("Pick a time that suits you") as HTMLIFrameElement;
      const url = new URL(frame.src);
      expect(url.origin + url.pathname).toBe("https://calendly.com/ravesoftsolutions23");
      expect(url.searchParams.get("name")).toBe("Kofi Mensah");
      expect(url.searchParams.get("email")).toBe("kofi@example.com");
      expect(url.searchParams.get("utm_source")).toBe("website_chat");
    });

    it("does not show the card for ordinary replies", async () => {
      language("en-GH");
      mockApi();
      render(<ChatWidget />);
      openChat();
      await screen.findByText("Hi — how can I help?");
      fireEvent.change(screen.getByLabelText("Message"), { target: { value: "What do you do?" } });
      fireEvent.click(screen.getByRole("button", { name: /send message/i }));
      await screen.findByText("ok");
      expect(screen.queryByText("Pick a time that suits you")).not.toBeInTheDocument();
    });
  });

  describe("end-of-chat feedback", () => {
    it("asks for a rating when the team closes the chat, sends it, and thanks the visitor", async () => {
      language("en-GH");
      delete (global as { EventSource?: unknown }).EventSource;
      const api = mockApi({ conv: () => conversation({ status: "closed" }), feedback: () => ({ ok: true, transcript_sent: true }) });
      render(<ChatWidget />);
      openChat();
      expect(await screen.findByText("How was this chat?")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("radio", { name: "4 / 5" }));
      fireEvent.change(screen.getByLabelText(/anything we could do better/i), { target: { value: "Fast replies" } });
      fireEvent.click(screen.getByLabelText("Email me this transcript"));
      fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "kofi@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Submit" }));

      expect(await screen.findByText(/transcript is on its way/i)).toBeInTheDocument();
      const call = api.mock.calls.find(([u]) => String(u).endsWith("/feedback"))!;
      expect(JSON.parse(String(call[1]!.body))).toEqual({ rating: 4, comment: "Fast replies", email: "kofi@example.com", send_transcript: true });
    });

    it("lets the visitor end the chat themselves, and does not ask twice", async () => {
      language("en-GH");
      delete (global as { EventSource?: unknown }).EventSource;
      mockApi();
      render(<ChatWidget />);
      openChat();
      await screen.findByText("Hi — how can I help?");
      expect(screen.queryByRole("button", { name: "End chat" })).not.toBeInTheDocument(); // nothing said yet

      fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Thanks, that's all" } });
      fireEvent.click(screen.getByRole("button", { name: /send message/i }));
      await screen.findByText("ok");
      fireEvent.click(screen.getByRole("button", { name: "End chat" }));
      expect(screen.getByText("How was this chat?")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled(); // needs a rating first
    });

    it("does not ask a visitor who already rated this chat", async () => {
      language("en-GH");
      delete (global as { EventSource?: unknown }).EventSource;
      mockApi({ conv: () => conversation({ status: "closed", rating: 5 }) });
      render(<ChatWidget />);
      openChat();
      await screen.findByText("Hi — how can I help?");
      expect(screen.queryByText("How was this chat?")).not.toBeInTheDocument();
    });
  });
});
