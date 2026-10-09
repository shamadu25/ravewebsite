import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { decideApproval } from "@/lib/os/approvals";

export const maxDuration = 60;

/** Approve many pending OUTREACH approvals at once. Each is decided (and sent) individually with its own audit record. */
export const POST = api("approval.decide", async ({ request, caller }) => {
  const { ids } = await jsonBody(request, z.object({ ids: z.array(z.number().int()).min(1).max(25) }));
  const rows = await prisma.osApproval.findMany({ where: { id: { in: ids }, orgId: ORG_ID, status: "PENDING", kind: "OUTREACH" }, orderBy: { id: "asc" } });
  let approved = 0, failed = 0;
  const errors: string[] = [];
  for (const r of rows) {
    try {
      const res = await decideApproval({ id: r.id, decision: "APPROVE", actor: caller.name, role: caller.role, note: "Bulk approved", ip: caller.ip });
      const ex = res.executionResult as { ok?: boolean; error?: string } | null;
      if (ex && ex.ok === false) { failed++; errors.push(`#${r.id}: ${ex.error}`); } else approved++;
    } catch (e) { failed++; errors.push(`#${r.id}: ${e instanceof Error ? e.message : "failed"}`); }
  }
  return { approved, failed, skipped: ids.length - rows.length, errors };
});
