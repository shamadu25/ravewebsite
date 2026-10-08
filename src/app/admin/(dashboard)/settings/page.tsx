import Link from "next/link";
import { PageHeader } from "@/components/os/ui";

const ITEMS = [
  ["Revenue goal", "Target, deadline, customers and pipeline targets.", "/admin/goals"], ["Team & roles", "Add people with their own role-based access.", "/admin/users"],
  ["Integrations", "Model providers, channels and webhooks.", "/admin/integrations"], ["Audit log", "Tamper-evident record of every action.", "/admin/audit"],
  ["Knowledge", "What your AI Employees know.", "/admin/brain"], ["AI employee factory", "Create industry employee templates.", "/admin/factory"],
] as const;

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle="Workspace configuration for RaveSoft (Internal)." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ITEMS.map(([t, d, href]) => <Link key={href} href={href} className="os-card os-card-hover block p-5"><h2 className="text-[15px] font-semibold">{t}</h2><p className="mt-1 text-[13px] text-[var(--muted)]">{d}</p></Link>)}
      </div>
    </div>
  );
}
