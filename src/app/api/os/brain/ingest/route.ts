import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { BRAIN_SECTIONS, chunkText, upsertBrainEntry } from "@/lib/os/brain";
import { assertPublicUrl } from "@/lib/os/website";

export const maxDuration = 60;

export const POST = api("brain.write", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({ section: z.enum(BRAIN_SECTIONS), title: z.string().min(1).max(160), text: z.string().max(200_000).optional(), url: z.string().url().optional(), allowedDepartments: z.array(z.string()).optional() }));
  let text = b.text ?? "";
  if (b.url) {
    const u = await assertPublicUrl(b.url);
    const res = await fetch(u, { redirect: "error", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "RaveSoftBot/1.0" } });
    if (!res.ok) throw new Error(`Could not fetch URL (${res.status}).`);
    const html = (await res.text()).slice(0, 800_000);
    const full = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    text = full.slice(0, 60_000);
  }
  if (!text.trim()) throw new Error("Nothing to ingest.");
  const chunks = chunkText(text);
  for (let i = 0; i < chunks.length; i++) {
    await upsertBrainEntry({ section: b.section, title: chunks.length > 1 ? `${b.title} (part ${i + 1}/${chunks.length})` : b.title, content: chunks[i], sourceUrl: b.url ?? null, allowedDepartments: b.allowedDepartments ?? null, actor: caller.name, actorType: "HUMAN" });
  }
  return { chunks: chunks.length };
});
