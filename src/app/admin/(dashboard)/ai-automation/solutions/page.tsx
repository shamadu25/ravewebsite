import Link from "next/link";
import { Card, PageHeader } from "@/components/os/ui";
import ApiForm from "@/components/os/ApiForm";
import { requireAdmin } from "@/lib/ai-automation/admin-auth";
import { human } from "@/lib/ai-automation/format";
import { getSolutions } from "@/lib/ai-automation/repo";
import { formatMoney } from "@/lib/ai-automation/pricing";
import { can } from "@/lib/os/rbac";

export const dynamic = "force-dynamic";

export default async function AiSolutions() {
  const { user, allowed } = await requireAdmin("ai.read");
  if (!allowed) return <p>No access.</p>;
  const solutions = await getSolutions({ includeInactive: true });
  return (
    <div>
      <PageHeader title="Solution catalogue" subtitle="Reusable AI solutions. No solution has a price until it is entered and approved here — unpriced solutions send proposals to manual review." />
      <Card className="overflow-x-auto !p-0"><table className="w-full min-w-[820px] text-sm"><thead className="bg-gray-50 text-left text-xs text-gray-500"><tr><th className="p-3">Solution</th><th>Industries</th><th>Base price</th><th>Hours</th><th>Weeks</th><th>Maintenance / mo</th><th>Active</th></tr></thead><tbody>
        {solutions.map((s) => <tr key={s.key} className="border-t border-gray-100 hover:bg-gray-50"><td className="p-3"><Link className="font-medium text-[var(--primary)] hover:underline" href={`/admin/ai-automation/solutions/${s.key}`}>{s.name}</Link></td><td className="text-xs text-gray-600">{s.mappings.map((m) => human(m.industrySlug)).join(", ")}</td><td>{s.basePrice != null ? formatMoney(s.basePrice, "USD") : <span className="text-amber-700">Not priced</span>}</td><td>{s.estimatedHours ?? "—"}</td><td>{s.deliveryWeeks ?? "—"}</td><td>{s.monthlyMaintenance != null ? formatMoney(s.monthlyMaintenance, "USD") : <span className="text-amber-700">Not set</span>}</td><td>{s.active ? "Yes" : "No"}</td></tr>)}
      </tbody></table></Card>
      {can(user.role, "ai.write") && <Card className="mt-6"><h2 className="mb-3 text-base font-semibold">New solution</h2><p className="mb-3 text-xs text-gray-500">Created inactive. Complete the details and industry mappings, then activate it.</p><ApiForm url="/api/ai-automation/admin/solutions" submitLabel="Create" fields={[{ name: "key", label: "Key (lowercase-with-dashes)", required: true }, { name: "name", label: "Name", required: true }, { name: "description", label: "Description", type: "textarea", required: true }]} /></Card>}
    </div>
  );
}
