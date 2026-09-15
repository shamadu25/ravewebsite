import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatWidget from "@/components/ai/ChatWidget";

describe("ChatWidget", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    window.localStorage.clear();
    window.sessionStorage.clear();
    jest.restoreAllMocks();
  });

  it("renders a launcher button and keeps the panel closed by default", () => {
    render(<ChatWidget />);

    expect(screen.getByRole("button", { name: /chat with rave ai/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a fallback message with a WhatsApp link when the backend is unreachable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network error"));

    render(<ChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: /chat with rave ai/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      await screen.findByText(/temporarily unavailable/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continue on whatsapp/i })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me")
    );
  });

  it("renders the assistant's opening message on a successful start", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "conv-123",
        stage: "new",
        status: "open",
        assistant_name: "Rave AI",
        quick_actions: [{ label: "Get More Sales", message: "I want more sales" }],
        messages: [
          { id: 1, role: "assistant", content: "Hi — how can I help?", created_at: null },
        ],
      }),
    }) as unknown as typeof fetch;

    render(<ChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: /chat with rave ai/i }));

    await waitFor(() => {
      expect(screen.getByText("Hi — how can I help?")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Get More Sales" })).toBeInTheDocument();
  });
});
