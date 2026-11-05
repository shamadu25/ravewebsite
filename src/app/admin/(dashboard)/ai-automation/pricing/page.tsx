import { Badge, Card, PageHeader } from "@/components/os/ui";
import { ActionButton, JsonEditor } from "@/components/admin-ai/controls";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { fmtDate } from "@/lib/ai-automation/format";
import { PRICING_RULE_KINDS } from "@/lib/ai-automation/pricing";
import { getFxConfig } from "@/lib/ai-automation/settings";
import { can } from "@/lib/os/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HELP: Record<string, string> = {
  COMPLEXITY_MULTIPLIER: 'key LOW | MEDIUM | HIGH → {"multiplier": 1.0}',
  INTEGRATION_FEE: 'key = integration key (e.g. whatsapp-business) → {"amount": 0}',
  THIRD_PARTY_API_FEE: 'key = integration key → {"oneTime": 0, "monthly": 0}',
  INFRASTRUCTURE_FEE: 'key "default" → {"monthly": 0}',
  TRAINING_FEE: 'key "default" → {"perSession": 0}',
  CUSTOM_DEV_RATE: 'key "default" → {"hourly": 0}',
  MIN_PROJECT_FEE: 'key "default" → {"amount": 0}',
  DISCOUNT: 'key any → {"minAgents": 3, "percent": 5} (volume discount)',
  TAX: 'key any → {"name": "VAT", "percent": 0, "appliesTo": "BOTH"}',
  APPROVAL_THRESHOLD: 'key "default" → {"maxDiscountPercent": 10, "maxInitialTotal": 20000}',
  MIN_MARGIN: 'key "default" → {"percent": 40}',
  COST_RATE: 'key "default" → {"hourly": 0} (internal cost per hour, for margin checks)',
  PAYMENT_SCHEDULE: 'key "default" → {"milestones": [{"label": "On acceptance", "percent": 50}, {"label": "On go-live", "percent": 50}]} (must total 100)',
  OPTIONAL_SERVICE: 'key any → {"name": "...", "amount": 0, "recurring": false}',
};

export default async function AiPricing() {
  const { user, allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>No access.</p>;
  const canEdit = can(user.role, "ai.pricing");
  const [rules, fx] = await Promise.all([prisma.aiPricingRule.findMany({ orderBy: [{ kind: "asc" }, { key: "asc" }] }), getFxConfig()]);
  return (
    <div>
      <PageHeader title="Pricing rules" subtitle="The deterministic pricing engine uses only these rules and the approved solution prices. The AI never sets a price. Missing rules send a proposal to manual review." />
      <Card className="mb-6">
        <h2 className="mb-1 text-base font-semibold">Exchange rates</h2>
        <p className="mb-3 text-xs text-gray-500">Units of currency per 1 USD, entered manually with their source and date. Rates are never fetched live. Without a rate, that currency cannot be quoted.</p>
        {canEdit ? <JsonEditor url="/api/ai-automation/admin/pricing/fx" initial={{ rates: Object.keys(fx.rates).length ? fx.rates : { GHS: { rate: 0, source: "e.g. Bank of Ghana mid-rate", asOf: new Date().toISOString() } } }} rows={10} /> : <pre className="text-xs">{JSON.stringify(fx, null, 2)}</pre>}
      </Card>
      {canEdit && (
        <Card className="mb-6">
          <h2 className="mb-1 text-base font-semibold">Add or replace a rule</h2>
          <p className="mb-3 text-xs text-gray-500">A rule is identified by kind + key; saving an existing pair replaces it. Parameters are validated before they are stored.</p>
          <JsonEditor method="POST" url="/api/ai-automation/admin/pricing/rules" rows={9} submitLabel="Save rule" initial={{ kind: "INTEGRATION_FEE", key: "whatsapp-business", label: "WhatsApp Business integration", params: { amount: 0 }, active: true }} />
          <details className="mt-4"><summary className="cursor-pointer text-sm font-medium text-[var(--primary)]">Rule kinds and parameters</summary><ul className="mt-2 space-y-1 text-xs text-gray-600">{PRICING_RULE_KINDS.map((k) => <li key={k}><span className="font-mono font-semibold">{k}</span> — {HELP[k]}</li>)}</ul></details>
        </Card>
      )}
      <Card className="!p-0">
        <div className="divide-y divide-gray-100">
          {rules.length === 0 && <p className="p-6 text-sm text-gray-500">No rules yet.</p>}
          {rules.map((r) => (
            <details key={r.id} className="p-4">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm"><span className="font-mono text-xs font-semibold">{r.kind}</span><span className="font-medium">{r.key}</span><span className="text-gray-600">{r.label}</span><Badge>{r.active ? "ACTIVE" : "PAUSED"}</Badge><span className="ml-auto text-xs text-gray-400">{r.updatedBy ?? "system"} · {fmtDate(r.updatedAt)}</span></summary>
              {canEdit && <div className="mt-3 space-y-3"><JsonEditor method="POST" url="/api/ai-automation/admin/pricing/rules" rows={7} initial={{ kind: r.kind, key: r.key, label: r.label, params: r.params, active: r.active, sortOrder: r.sortOrder }} /><ActionButton variant="danger" label="Delete rule" url="/api/ai-automation/admin/pricing/rules" method="DELETE" body={{ id: r.id }} confirm="Delete this pricing rule? Quotes that need it will go to manual review." /></div>}
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
