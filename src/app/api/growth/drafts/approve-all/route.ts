import { prisma } from "@/lib/prisma";
import { growthApi } from "@/lib/growth/api";
import { approveDraft } from "@/lib/growth/drafts";

export const maxDuration = 60;
/** One click approves every outreach draft that passed policy, each bound to its exact content hash. Failures are reported, not hidden. */
export const POST = growthApi("approval.decide", async ({ caller }) => {
  const drafts = await prisma.grDraft.findMany({ where: { status: "PENDING_APPROVAL" }, orderBy: { id: "asc" }, take: 50, select: { id: true } });
  const out = { approved: 0, failed: [] as { id: number; reason: string }[] };
  for (const d of drafts) {
    try { await approveDraft(d.id, caller.name); out.approved++; } catch (e) { out.failed.push({ id: d.id, reason: e instanceof Error ? e.message : "error" }); }
  }
  return out;
});
