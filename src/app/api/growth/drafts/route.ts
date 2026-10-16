import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { growthApi } from "@/lib/growth/api";
import { jsonBody } from "@/lib/os/http";
import { createDraftVersion, generateDraft, PROMPT_VERSION } from "@/lib/growth/drafts";
import { ensureOpportunity } from "@/lib/growth/outbox";

export const maxDuration = 60;
export const GET = growthApi("approval.read", async ({ request }) => {
  const status = request.nextUrl.searchParams.get("status") ?? "PENDING_APPROVAL";
  return prisma.grDraft.findMany({ where: { status }, orderBy: { id: "desc" }, take: 100, include: { company: { include: { evidence: true } } } });
});
export const POST = growthApi("outreach.send", async ({ request, caller }) => {
  const b = await jsonBody(request, z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("generate"), companyId: z.number().int(), contactId: z.number().int(), touch: z.number().int().min(1).max(3) }),
    // Editing creates a NEW version; the previous version and its approval are invalidated.
    z.object({ mode: z.literal("edit"), draftId: z.number().int(), subject: z.string().min(1).max(120), body: z.string().min(20).max(4000) }),
  ]));
  if (b.mode === "generate") { await ensureOpportunity(b.companyId, b.contactId); return generateDraft({ ...b, actor: caller.name }); }
  const d = await prisma.grDraft.findUniqueOrThrow({ where: { id: b.draftId } });
  return createDraftVersion({ companyId: d.companyId, contactId: d.contactId, toEmail: d.toEmail, touch: d.touch, sequenceKey: d.sequenceKey, subject: b.subject, body: b.body, evidenceIds: d.evidenceIds as number[], model: `human-edit:${caller.name}`, promptVersion: PROMPT_VERSION, actor: caller.name, rationale: `Edited from v${d.version}` });
});
