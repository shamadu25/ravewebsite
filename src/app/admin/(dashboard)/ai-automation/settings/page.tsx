import { Badge, Card, PageHeader } from "@/components/os/ui";
import { ActionButton, JsonEditor } from "@/components/admin-ai/controls";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { getFollowupConfig } from "@/lib/ai-automation/email/jobs";
import { smtpConfigured } from "@/lib/ai-automation/email/send";
import { fmtDate, human } from "@/lib/ai-automation/format";
import { getCompany, getProposalSettings, getQualificationConfig } from "@/lib/ai-automation/settings";
import { kovabotProvider, selectProvider } from "@/lib/ai-automation/integrations/provider";
import { llmStatus } from "@/lib/os/llm";
import { can } from "@/lib/os/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AiSettings() {
  const { user, allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>No access.</p>;
  const edit = can(user.role, "ai.settings");
  const [company, proposal, qual, follow, projects, logs] = await Promise.all([getCompany(), getProposalSettings(), getQualificationConfig(), getFollowupConfig(), prisma.aiImplementationProject.findMany({ orderBy: { id: "desc" }, take: 20, include: { proposal: true } }), prisma.aiIntegrationLog.findMany({ orderBy: { id: "desc" }, take: 10 })]);
  const llm = llmStatus();
  const url = "/api/ai-automation/admin/settings";
  const block = (title: string, hint: string, key: string, value: unknown, rows = 12) => (
    <Card><h2 className="mb-1 text-base font-semibold">{title}</h2><p className="mb-3 text-xs text-gray-500">{hint}</p>{edit ? <JsonEditor url={url} wrapKey={key} initial={value} rows={rows} /> : <pre className="overflow-x-auto text-xs">{JSON.stringify(value, null, 2)}</pre>}</Card>
  );
  return (
    <div className="space-y-6">
      <PageHeader title="System settings" subtitle="Secrets (API keys, SMTP passwords, signing secrets) are environment variables and are never shown or stored here." />
      <Card>
        <h2 className="mb-3 text-base font-semibold">Providers</h2>
        <ul className="space-y-2 text-sm">
          <li>AI provider: {llm.configured ? <Badge>ACTIVE</Badge> : <Badge>PAUSED</Badge>} <span className="text-gray-600">{llm.providers.map((p) => `${p.name}: ${p.available ? "configured" : "not set"}`).join(" · ")}. Model routing is configured with OS_PROVIDER_* / OS_*_MODEL_* variables. Without a key, a rules-based analysis is used and leads are flagged for manual review.</span></li>
          <li>Email (SMTP): {smtpConfigured() ? <Badge>ACTIVE</Badge> : <Badge>PAUSED</Badge>} <span className="text-gray-600">Delivery confirmation additionally needs AI_EMAIL_WEBHOOK_SECRET and a provider webhook to /api/ai-automation/email-events.</span></li>
          <li>Deployment provider: <Badge>{selectProvider().id === "manual" ? "PAUSED" : "ACTIVE"}</Badge> <span className="text-gray-600">Selected: {selectProvider().id}. Kovabot is {kovabotProvider.isAvailable() ? "available" : "not available — its deployment API contract has not been verified, so nothing is provisioned automatically (see docs/kovabot-integration.md)"}.</span></li>
        </ul>
      </Card>
      {block("Company information (used in proposals and emails)", "Defaults come from the website's company details. salesNotificationEmail receives internal notifications.", "company", company, 10)}
      {block("Proposal settings", "Validity, mandatory approval, assumptions, exclusions, payment terms note and acceptance instructions. Keep requireApproval on so no proposal reaches a customer without review.", "proposal", proposal, 18)}
      {block("Lead qualification", "Weights and thresholds (high ≥, medium ≥). Undisclosed budgets are scored neutrally regardless of these settings.", "qualification", qual, 14)}
      {block("Follow-up sequence", "Delay in days after the proposal is sent, template, maximum attempts and stop conditions. Replies are not auto-detected: use “Customer replied” on the lead.", "followup", { active: follow.active, maxAttempts: follow.maxAttempts, stopConditions: follow.stopConditions, steps: follow.steps }, 18)}
      <Card>
        <h2 className="mb-3 text-base font-semibold">Implementation projects</h2>
        {projects.length === 0 ? <p className="text-sm text-gray-500">None yet. A record is created when a proposal is marked accepted.</p> : <ul className="divide-y divide-gray-100 text-sm">{projects.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><span>{p.proposal.ref} · {human(p.status)} · provider {p.provider}</span>{can(user.role, "ai.write") && <ActionButton label="Request provisioning" url={`/api/ai-automation/admin/projects/${p.id}`} confirm="Record a provisioning request? With no verified deployment provider this creates a manual hand-off only." />}</li>)}</ul>}
        {logs.length > 0 && <><h3 className="mt-5 mb-2 text-sm font-semibold">Recent integration log</h3><ul className="space-y-1 text-xs text-gray-600">{logs.map((l) => <li key={l.id}>{fmtDate(l.createdAt)} · {l.provider}/{l.action} · {l.status}{l.error ? ` · ${l.error}` : ""}</li>)}</ul></>}
      </Card>
      <Card>
        <h2 className="mb-2 text-base font-semibold">Security controls in force</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700"><li>Server-side validation of every answer against the configured questions; customer text is stripped of control characters and HTML and always escaped on output.</li><li>Rate limits and spam protection on the assessment (per IP, per email, global; honeypot; signed time-trap token; optional Turnstile).</li><li>The AI receives no contact details, cannot set prices, and its output must pass schema, catalogue-key and no-invented-numbers checks.</li><li>Proposal PDFs are stored privately and served only through authenticated admin routes or signed, expiring customer links.</li><li>Role-based permissions on every admin action; changes are recorded in the activity log.</li><li>Customers can opt out, and request correction or deletion at /ai-automation/privacy-request.</li></ul>
      </Card>
    </div>
  );
}
