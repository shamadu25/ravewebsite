import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/ai/rateLimit";
import { parseAfter, readLiveUpdates, type LiveState } from "@/lib/ai/liveUpdates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Serverless hosts cap request time; the stream ends itself just before this and the browser's EventSource
// reconnects (sending Last-Event-ID) so the visitor never notices.
export const maxDuration = 30;

const STREAM_MS = 25_000;
const TICK_MS = 2_000;

/**
 * Server-Sent Events for the chat widget: team replies and typing state arrive within ~2 seconds without
 * the browser polling. Events: `message` (a team reply, SSE id = message id) and `state` (human active /
 * typing / closed, sent when it changes). The widget falls back to the polling endpoint if this fails.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // A tab reconnects every ~25s (2-3/min); allow generous headroom but stop connection floods.
  if (rateLimit(`stream:${id}`, 12, 60_000)) {
    return new Response(JSON.stringify({ error: "Too many requests." }), { status: 429, headers: { "Content-Type": "application/json" } });
  }

  const resume = parseAfter(request.headers.get("last-event-id"));
  let lastId = Math.max(resume, parseAfter(request.nextUrl.searchParams.get("after")));

  const first = await readLiveUpdates(id, lastId);
  if (!first) {
    return new Response(JSON.stringify({ error: "Conversation not found." }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  const encoder = new TextEncoder();
  let lastState: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: string) => {
        if (!closed) controller.enqueue(encoder.encode(chunk));
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        if (timer) clearTimeout(timer);
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      };
      request.signal.addEventListener("abort", finish);

      const emit = (u: { messages: { id: number }[] } & LiveState) => {
        for (const m of u.messages) {
          write(`id: ${m.id}\nevent: message\ndata: ${JSON.stringify(m)}\n\n`);
          lastId = Math.max(lastId, m.id);
        }
        const state: LiveState = { human_active: u.human_active, agent_typing: u.agent_typing, closed: u.closed };
        const serialized = JSON.stringify(state);
        if (serialized !== lastState) {
          lastState = serialized;
          write(`event: state\ndata: ${serialized}\n\n`);
        }
      };

      write("retry: 3000\n\n");
      emit(first);

      const startedAt = Date.now();
      const tick = async () => {
        if (closed) return;
        if (Date.now() - startedAt >= STREAM_MS) return finish();
        try {
          const u = await readLiveUpdates(id, lastId);
          if (u) emit(u);
          write(": ping\n\n"); // keeps proxies from idling the connection out
        } catch {
          return finish(); // transient DB error: let the browser reconnect
        }
        timer = setTimeout(() => void tick(), TICK_MS);
      };
      timer = setTimeout(() => void tick(), TICK_MS);
    },
    cancel() {
      closed = true;
      if (timer) clearTimeout(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx: do not buffer
    },
  });
}
