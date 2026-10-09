import { listTools } from "@/lib/os/tools/registry";
import { channelStatuses } from "@/lib/os/channels";
import { llmStatus } from "@/lib/os/llm";
import { Badge, Card, PageHeader, ago } from "@/components/os/ui";
import ApiButton from "@/components/os/ApiButton";
import { imapConfig } from "@/lib/os/inbox";
import { emailDnsReport } from "@/lib/os/email-dns";
import { emailDailyCap, emailsSentToday } from "@/lib/os/outreach";
import { prisma } from "@/lib/prisma";
import { chargeCurrency, fxRate, paystackConfigured } from "@/lib/os/paystack";
import { ORG_ID } from "@/lib/os/constants";

export const dynamic = "force-dynamic";

const ENV_CHECKS: Array<[string, string, string]> = [
  ["Database", "DATABASE_URL", "Prisma / MySQL"], ["Scheduler secret", "CRON_SECRET", "Protects /api/os/cron"], ["Payment webhook", "PAYMENTS_WEBHOOK_SECRET", "Signed payment events"],
  ["Google Places", "GOOGLE_PLACES_API_KEY", "Prospect discovery"],
];

export default async function IntegrationsPage() {
  const tools = listTools();
  const channels = channelStatuses();
  const llm = llmStatus();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "";
  const domain = from.replace(/^.*@/, "").replace(/>.*$/, "");
  const imap = imapConfig();
  const [dns, sentToday, lastPollRow, recentIn] = await Promise.all([
    domain ? emailDnsReport(domain, process.env.SMTP_HOST) : Promise.resolve([]),
    emailsSentToday().catch(() => 0),
    prisma.systemSetting.findUnique({ where: { key: `os:${ORG_ID}:inbox_last_poll` } }).catch(() => null),
    prisma.osInboundEmail.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, take: 5 }).catch(() => []),
  ]);
  const row = (ok: boolean) => <Badge>{ok ? "ACTIVE" : "DRAFT"}</Badge>;
  return (
    <div className="space-y-6">
      <PageHeader title="Integrations" subtitle="Status is computed from server configuration. Secrets are never sent to the browser." />
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Email</h2>
          <div className="flex flex-wrap gap-2"><ApiButton label="Send test email to me" url="/api/os/email/test" result="emailTest" /><ApiButton label="Check inbox now" url="/api/os/inbox/check" result="inbox" /></div>
        </div>
        <ul className="space-y-1.5 text-[13px]">
          <li className="flex justify-between gap-3"><span>Outbound (SMTP)</span><span>{channels.find((c) => c.channel === "EMAIL")?.connected ? `Connected — sending as ${from}` : "NOT CONNECTED"}</span></li>
          <li className="flex justify-between gap-3"><span>Inbound (IMAP, read-only)</span><span>{imap ? `Connected — reading ${imap.user} (never modifies the mailbox)` : "NOT CONNECTED — set IMAP_HOST / IMAP_USER / IMAP_PASS (defaults to the SMTP login)"}</span></li>
          <li className="flex justify-between gap-3"><span>Last inbox check</span><span>{typeof lastPollRow?.value === "string" ? ago(new Date(lastPollRow.value)) : "Never"}</span></li>
          <li className="flex justify-between gap-3"><span>Sent today (automated)</span><span>{sentToday} / {emailDailyCap()} daily cap</span></li>
        </ul>
        {dns.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="mb-2 text-[12px] font-semibold uppercase text-gray-500">Deliverability for {domain}</p>
            <ul className="space-y-1.5 text-[13px]">{dns.map((d) => <li key={d.label} className="flex gap-3"><span className="w-14 shrink-0 font-medium">{d.label}</span><span className={d.ok === false ? "text-red-700" : d.ok ? "text-emerald-700" : "text-amber-700"}>{d.ok === false ? "✗ " : d.ok ? "✓ " : "? "}{d.detail}</span></li>)}</ul>
          </div>
        )}
        {recentIn.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3"><p className="mb-2 text-[12px] font-semibold uppercase text-gray-500">Recent inbound handled</p>
            <ul className="space-y-1 text-[13px]">{recentIn.map((r) => <li key={r.id}><Badge>{r.action === "REPLY" ? "COMPLETED" : r.action === "BOUNCE" ? "FAILED" : "PENDING"}</Badge> {r.fromAddress} <span className="text-gray-500">— {r.action.replace(/_/g, " ").toLowerCase()} · {ago(r.receivedAt)}</span></li>)}</ul></div>
        )}
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Payments (Paystack)</h2>
        <ul className="space-y-1.5 text-[13px]">
          <li className="flex justify-between gap-3"><span>Secret key</span><span>{paystackConfigured() ? "Connected" : "NOT CONNECTED — set PAYSTACK_SECRET_KEY in Vercel"}</span></li>
          <li className="flex justify-between gap-3"><span>Charge currency</span><span>{chargeCurrency()} (USD prices × {fxRate()})</span></li>
          <li className="flex justify-between gap-3"><span>Webhook URL</span><span className="break-all font-mono text-[12px]">https://ravesoftsolutions.com/api/os/webhooks/paystack</span></li>
        </ul>
        <p className="mt-3 text-[12px] text-gray-500">In Paystack: Settings → API Keys &amp; Webhooks → paste the webhook URL. Payments, renewals, cancellations and failed charges then update revenue automatically. Make sure your Paystack account can charge in {chargeCurrency()}; if it only supports GHS, set PAYSTACK_CURRENCY=GHS and PAYSTACK_FX_RATE to the current USD→GHS rate.</p>
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-900">Model providers</h2><a className="text-[12px] font-medium text-[var(--primary)]" href="/admin/models">Open Model lab →</a></div>
        <ul className="space-y-1 text-sm">{llm.providers.map((p) => <li key={p.name} className="flex items-center justify-between"><span>{p.name}</span><span className="text-xs">{p.available ? "Connected" : "NOT CONNECTED"}</span></li>)}</ul>
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-900">Outbound channels</h2><a className="text-[12px] font-medium text-[var(--primary)]" href="/admin/whatsapp">WhatsApp setup guide →</a></div>
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
