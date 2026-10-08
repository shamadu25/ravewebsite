import { listTools } from "@/lib/os/tools/registry";
import { channelStatuses } from "@/lib/os/channels";
import { llmStatus } from "@/lib/os/llm";
import { Badge, Card, PageHeader } from "@/components/os/ui";

export const dynamic = "force-dynamic";

const ENV_CHECKS: Array<[string, string, string]> = [
  ["Database", "DATABASE_URL", "Prisma / MySQL"], ["Scheduler secret", "CRON_SECRET", "Protects /api/os/cron"], ["Payment webhook", "PAYMENTS_WEBHOOK_SECRET", "Signed payment events"],
  ["Google Places", "GOOGLE_PLACES_API_KEY", "Prospect discovery"],
];

export default function IntegrationsPage() {
  const tools = listTools();
  const channels = channelStatuses();
  const llm = llmStatus();
  const row = (ok: boolean) => <Badge>{ok ? "ACTIVE" : "DRAFT"}</Badge>;
  return (
    <div className="space-y-6">
      <PageHeader title="Integrations" subtitle="Status is computed from server configuration. Secrets are never sent to the browser." />
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Model providers</h2>
        <ul className="space-y-1 text-sm">{llm.providers.map((p) => <li key={p.name} className="flex items-center justify-between"><span>{p.name}</span><span className="text-xs">{p.available ? "Connected" : "NOT CONNECTED"}</span></li>)}</ul>
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Outbound channels</h2>
        <ul className="space-y-1 text-sm">{channels.map((c) => <li key={c.channel} className="flex items-center justify-between gap-3"><span>{c.channel} <span className="text-xs text-gray-400">({c.provider})</span></span><span className="text-xs text-gray-600">{c.connected ? "Connected" : `NOT CONNECTED — ${c.reason}`}</span></li>)}</ul>
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Server configuration</h2>
        <ul className="space-y-1 text-sm">{ENV_CHECKS.map(([label, env, desc]) => <li key={env} className="flex items-center justify-between gap-3"><span>{label} <span className="text-xs text-gray-400">{desc}</span></span><span className="text-xs">{row(Boolean(process.env[env]))} {process.env[env] ? "configured" : `set ${env}`}</span></li>)}</ul>
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Tool registry</h2>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-500"><th className="py-1 font-medium">Tool</th><th className="py-1 font-medium">Provider</th><th className="py-1 font-medium">Risk</th><th className="py-1 font-medium">Status</th></tr></thead><tbody>
          {tools.map((t) => <tr key={t.name} className="border-t border-gray-100"><td className="py-1.5 font-mono text-xs">{t.name}</td><td className="py-1.5 text-gray-600">{t.provider}</td><td className="py-1.5 text-xs">{t.riskLevel}{t.alwaysRequiresApproval ? " · always needs approval" : ""}</td><td className="py-1.5 text-xs">{!t.implemented ? "NOT IMPLEMENTED" : t.enabled ? "Connected" : `NOT CONNECTED — ${t.reason}`}</td></tr>)}
        </tbody></table></div>
      </Card>
    </div>
  );
}
