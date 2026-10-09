import { MAX_MEDIA_BYTES, mediaToMessage, understandMedia, type MediaKind } from "./media";

const graph = () => process.env.WHATSAPP_GRAPH_URL ?? "https://graph.facebook.com/v20.0";

/** Downloads a media file Meta delivered to our webhook (official Cloud API only: id → temporary URL → bytes). */
export async function downloadWhatsAppMedia(mediaId: string): Promise<{ bytes: Buffer; mime: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("WhatsApp is not connected.");
  const meta = await fetch(`${graph()}/${encodeURIComponent(mediaId)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
  const m = (await meta.json().catch(() => ({}))) as { url?: string; mime_type?: string; file_size?: number; error?: { message?: string } };
  if (!meta.ok || !m.url) throw new Error(m.error?.message ?? `Media lookup failed (${meta.status})`);
  if ((m.file_size ?? 0) > MAX_MEDIA_BYTES) throw new Error("Media file is too large to process.");
  const file = await fetch(m.url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(25_000) });
  if (!file.ok) throw new Error(`Media download failed (${file.status})`);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > MAX_MEDIA_BYTES) throw new Error("Media file is too large to process.");
  return { bytes, mime: (m.mime_type ?? file.headers.get("content-type") ?? "").split(";")[0] };
}

/** Turns an inbound WhatsApp voice note/photo into the text the reply pipeline works with. Never throws: a failure still records that something arrived. */
export async function whatsappMediaToText(kind: MediaKind, mediaId: string, caption?: string): Promise<string> {
  try {
    const { bytes, mime } = await downloadWhatsAppMedia(mediaId);
    const base = mediaToMessage(kind, await understandMedia(kind, mime, bytes));
    return caption ? `${base} (Caption: ${caption})` : base;
  } catch {
    return kind === "audio" ? "[Voice note received — it could not be read automatically; please listen to it in WhatsApp]" : `[Photo received — it could not be read automatically${caption ? `; caption: ${caption}` : ""}]`;
  }
}
