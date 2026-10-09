import Link from "next/link";
import { PageHeader, Card } from "@/components/os/ui";
import ApiForm from "@/components/os/ApiForm";
import { getGhsPerUsd } from "@/lib/os/fx";

const ITEMS = [
  ["Revenue goal", "Target, deadline, customers and pipeline targets.", "/admin/goals"], ["Team & roles", "Add people with their own role-based access.", "/admin/users"],
  ["Integrations", "Channels, payments and webhooks.", "/admin/integrations"], ["WhatsApp setup", "Official Cloud API checklist and safety rules.", "/admin/whatsapp"], ["Model lab", "Test and compare OpenAI, Gemini and Claude on our tasks.", "/admin/models"], ["Audit log", "Tamper-evident record of every action.", "/admin/audit"],
  ["Knowledge", "What your AI Employees know.", "/admin/brain"], ["AI employee factory", "Create industry employee templates.", "/admin/factory"],
] as const;

export default async function SettingsPage() {
  const fx = await getGhsPerUsd();
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle="Workspace configuration for RaveSoft (Internal)." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ITEMS.map(([t, d, href]) => <Link key={href} href={href} className="os-card os-card-hover block p-5"><h2 className="text-[15px] font-semibold">{t}</h2><p className="mt-1 text-[13px] text-[var(--muted)]">{d}</p></Link>)}
      </div>
      <Card>
        <h2 className="text-[15px] font-semibold">Exchange rate (GHS per 1 USD)</h2>
        <p className="mt-1 mb-3 text-[13px] text-[var(--muted)]">CliqPOS prices are in GHS. New payments are converted to USD at this rate when they arrive; entries already recorded keep the rate they were booked at. Current: <b>{fx.ghsPerUsd}</b>{fx.updatedAt ? ` (updated ${fx.updatedAt.slice(0, 10)})` : " (default, never changed)"}.</p>
        <ApiForm url="/api/os/settings/fx" submitLabel="Update rate" fields={[{ name: "ghsPerUsd", label: "GHS per USD", type: "number", required: true, defaultValue: fx.ghsPerUsd }]} />
      </Card>
    </div>
  );
}
