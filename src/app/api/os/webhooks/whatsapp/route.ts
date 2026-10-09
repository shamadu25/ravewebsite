import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { handleInboundReply } from "@/lib/os/inbound";
import { whatsappMediaToText } from "@/lib/os/whatsapp-media";
import { after } from "next/server";
import { processQueue } from "@/lib/os/runtime";

/** Meta webhook verification handshake. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && sp.get("hub.mode") === "subscribe" && sp.get("hub.verify_token") === token) return new NextResponse(sp.get("hub.challenge") ?? "", { status: 200 });
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return NextResponse.json({ error: "WhatsApp webhook is not configured." }, { status: 503 });
  const raw = await request.text();
  const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  const given = request.headers.get("x-hub-signature-256") ?? "";
  if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  const body = JSON.parse(raw || "{}") as { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ from: string; type: string; text?: { body: string }; audio?: { id: string }; image?: { id: string; caption?: string } }> } }> }> };
  let handled = 0;
  for (const e of body.entry ?? []) for (const c of e.changes ?? []) for (const m of c.value?.messages ?? []) {
    let text = "";
    if (m.type === "text" && m.text?.body) text = m.text.body;
    else if (m.type === "audio" && m.audio?.id) text = await whatsappMediaToText("audio", m.audio.id);
    else if (m.type === "image" && m.image?.id) text = await whatsappMediaToText("image", m.image.id, m.image.caption);
    if (!text) continue;
    await handleInboundReply({ channel: "WHATSAPP", from: m.from, text, actor: "webhook:whatsapp" });
    handled++;
  }
  if (handled) after(() => processQueue({ maxTasks: 5, budgetMs: 40_000 }).catch(() => undefined));
  return NextResponse.json({ ok: true, handled });
}
