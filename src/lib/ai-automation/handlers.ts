/** Registers every job handler. Import this module (side effect) from any entry point that runs jobs. */
import { registerHandler, setFailureHook, runJobs, enqueueJob } from "./jobs";
import { runAnalysisForAssessment, runMatchAndPrice } from "./analysis-service";
import { createProposalForAssessment, generatePdf, expireProposals } from "./proposal/service";
import { processFollowups, sendCustomerProposal, sendFailureAlert, sendInternalNotification } from "./email/jobs";
import { provisionProject } from "./integrations/provider";
import { ensureSeeded } from "./seed";

const n = (v: unknown) => { const x = Number(v); if (!Number.isInteger(x) || x <= 0) throw new Error("Invalid job payload."); return x; };

registerHandler("ANALYSIS", async (p) => { await ensureSeeded(); await runAnalysisForAssessment(n(p.assessmentId)); });
registerHandler("MATCH_PRICE", async (p) => { await runMatchAndPrice(n(p.assessmentId)); });
registerHandler("PROPOSAL", async (p) => { await createProposalForAssessment(n(p.assessmentId), { calculationId: p.calculationId ? n(p.calculationId) : undefined }); });
registerHandler("PDF", async (p) => { await generatePdf(n(p.proposalId), p.version ? n(p.version) : undefined); });
registerHandler("EMAIL", async (p) => {
  const id = n(p.proposalId);
  if (p.kind === "customer_proposal") return void (await sendCustomerProposal(id));
  if (p.kind === "internal_new_opportunity") return void (await sendInternalNotification(id));
  throw new Error(`Unknown email job kind "${String(p.kind)}".`);
});
registerHandler("FOLLOWUP", async () => { await processFollowups(); });
registerHandler("PROVISION", async (p) => { await provisionProject(n(p.projectId)); });
setFailureHook((job, error) => sendFailureAlert(job.type, job.id, error));

/** One scheduler tick: drain jobs, expire proposals, send due follow-ups. Safe to call as often as you like (idempotent). */
export async function aiAutomationTick(budgetMs = 40_000) {
  const jobs = await runJobs({ budgetMs });
  const expired = await expireProposals().catch(() => 0);
  const followups = await processFollowups().catch(() => ({ sent: 0, cancelled: 0 }));
  return { jobs, expired, followups };
}
export { runJobs, enqueueJob };
