import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { can } from "@/lib/os/rbac";
import { EditableSectionsSchema } from "@/lib/ai-automation/proposal/content";
import { approveProposal, editProposal, queueSend, recordOutcome, rejectProposal } from "@/lib/ai-automation/proposal/service";
import { enqueueJob } from "@/lib/ai-automation/jobs";
import { COMPLEXITIES, CURRENCIES } from "@/lib/ai-automation/types";

const QuoteInputSchema = z.object({
  items: z.array(z.object({ key: z.string().max(80), complexity: z.enum(COMPLEXITIES).optional(), quantity: z.number().int().min(1).max(50).optional() })).min(1).max(20),
  options: z.object({
    currency: z.enum(CURRENCIES).optional(), additionalDevHours: z.number().min(0).max(5000).optional(), trainingSessions: z.number().int().min(0).max(50).optional(),
    optionalServices: z.array(z.string().max(80)).max(20).optional(), manualDiscountPercent: z.number().min(0).max(100).optional(), manualDiscountReason: z.string().max(120).optional(),
    priceOverrides: z.record(z.string().max(80), z.number().min(0).max(10_000_000)).optional(),
  }),
});

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("edit"), sections: EditableSectionsSchema.optional(), quoteInput: QuoteInputSchema.optional(), note: z.string().max(400).optional() }),
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().min(3).max(400) }),
  z.object({ action: z.literal("send") }),
  z.object({ action: z.literal("resend") }),
  z.object({ action: z.literal("regenerate_pdf") }),
  z.object({ action: z.literal("outcome"), outcome: z.enum(["NEGOTIATION", "ACCEPTED", "DECLINED"]), reason: z.string().max(400).optional() }),
]);

export const POST = api<{ id: string }>("ai.write", async ({ request, caller, params }) => {
  const b = await jsonBody(request, Body);
  const id = Number(params.id);
  const need = (perm: "ai.approve" | "ai.pricing") => { if (!can(caller.role, perm)) throw new Error(`Permission denied: ${perm} is required.`); };
  switch (b.action) {
    case "edit": {
      if (b.quoteInput?.options.priceOverrides && Object.keys(b.quoteInput.options.priceOverrides).length) need("ai.pricing");
      return editProposal(id, { sections: b.sections, quoteInput: b.quoteInput, note: b.note, actor: caller.name, role: caller.role });
    }
    case "approve": need("ai.approve"); await approveProposal(id, caller.name, caller.role); return { approved: true };
    case "reject": need("ai.approve"); await rejectProposal(id, caller.name, b.reason); return { rejected: true };
    case "send": need("ai.approve"); await queueSend(id, caller.name); return { queued: true };
    case "resend": need("ai.approve"); await queueSend(id, caller.name, { resend: true }); return { queued: true };
    case "regenerate_pdf": await enqueueJob({ type: "PDF", key: `pdf:${id}:manual:${Date.now()}`, payload: { proposalId: id } }); return { queued: true };
    case "outcome": await recordOutcome(id, b.outcome, caller.name, { reason: b.reason }); return { recorded: true };
  }
});

