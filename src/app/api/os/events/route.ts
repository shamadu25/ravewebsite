import { NextRequest } from "next/server";
import { getCaller } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const LIVE = /^(task\.|approval\.|opportunity\.|revenue\.|customer\.|agent\.|workflow\.|product\.|tool\.call|commander\.)/;

/** Server-sent events (spec §59): streams new audit events for ~55s; the client reconnects. Names only — no payloads leave the server. */
export async function GET(request: NextRequest) {
  const caller = await getCaller(request);
  if (!caller) return new Response("Unauthenticated", { status: 401 });
  const enc = new TextEncoder();
  const last = await prisma.osAuditLog.findFirst({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, select: { id: true } });
  let cursor = last?.id ?? 0;
  const stream = new ReadableStream({
    async start(controller) {
      const started = Date.now();
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      send("ready", { cursor });
      while (Date.now() - started < 55_000 && !request.signal.aborted) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const rows = await prisma.osAuditLog.findMany({ where: { orgId: ORG_ID, id: { gt: cursor } }, orderBy: { id: "asc" }, take: 50, select: { id: true, action: true } });
          if (rows.length) { cursor = rows[rows.length - 1].id; const hits = rows.filter((r) => LIVE.test(r.action)); if (hits.length) send("change", { actions: [...new Set(hits.map((h) => h.action))] }); }
          else send("ping", {});
        } catch { break; }
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store, no-transform", Connection: "keep-alive" } });
}
