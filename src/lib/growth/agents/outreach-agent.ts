import { prisma } from "@/lib/prisma";
import { GROWTH_ORG } from "../config";
import { generateDraft } from "../drafts";
import { ensureOpportunity } from "../outbox";
import { getCadence } from "../cadence";

/** Prepares the next email for every eligible company. Drafts only: a human approves each exact version before anything sends. */
export async function runOutreachAgent(max = 20) {
  const out = { touch1: 0, followUps: 0, skipped: 0, errors: [] as string[] };
  const cad = await getCadence();
  const companies = await prisma.grCompany.findMany({
    where: { orgId: GROWTH_ORG, status: "QUALIFIED", outreachDisabled: false, contacts: { some: { status: "VERIFIED" } } },
    include: { contacts: { where: { status: "VERIFIED" }, take: 1, orderBy: { id: "asc" } }, drafts: { select: { touch: true, status: true, createdAt: true } } },
    orderBy: [{ fitScore: "desc" }, { id: "asc" }], take: max * 4,
  });
  for (const c of companies) {
    if (out.touch1 + out.followUps >= max) break;
    const contact = c.contacts[0];
    const touches = new Set(c.drafts.filter((d) => !["REJECTED", "INVALIDATED", "SUPERSEDED"].includes(d.status)).map((d) => d.touch));
    const replied = await prisma.grReply.count({ where: { companyId: c.id, category: { not: "OUT_OF_OFFICE" } } });
    if (replied > 0) { out.skipped++; continue; }
    let touch = 0;
    if (!touches.has(1)) touch = 1;
    else {
      const next = [2, 3].find((t) => !touches.has(t));
      if (!next) { out.skipped++; continue; }
      const prior = await prisma.grOutbox.findFirst({ where: { companyId: c.id, status: "SENT", draft: { touch: next - 1 } }, orderBy: { id: "desc" } });
      const wait = (cad.followUpDays[Math.min(next - 2, cad.followUpDays.length - 1)] ?? 7) * 86400_000;
      // Draft a few days early so the human can approve it before it is due; the dispatcher still enforces the interval.
      if (prior?.sentAt && Date.now() >= prior.sentAt.getTime() + wait - 2 * 86400_000) touch = next;
    }
    if (!touch) { out.skipped++; continue; }
    try {
      await ensureOpportunity(c.id, contact.id);
      await generateDraft({ companyId: c.id, contactId: contact.id, touch, actor: "agent:outreach" });
      if (touch === 1) out.touch1++; else out.followUps++;
    } catch (e) { out.errors.push(`#${c.id}: ${e instanceof Error ? e.message : "error"}`); }
  }
  return out;
}
