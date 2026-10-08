import { loadTemplates } from "@/lib/os/recommend";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import ApiForm from "@/components/os/ApiForm";
import { Card, PageHeader } from "@/components/os/ui";

export const dynamic = "force-dynamic";

export default async function FactoryPage() {
  const [templates, custom] = await Promise.all([loadTemplates(), prisma.osEmployeeTemplate.findMany({ where: { orgId: ORG_ID, NOT: { definition: { equals: undefined } } } }).catch(() => [])]);
  const withDef = custom.filter((c) => c.definition);
  return (
    <div className="space-y-6">
      <PageHeader title="AI employee factory" subtitle="Create a new industry employee template — prompt, workflow, knowledge needs, onboarding, pricing and pitch — without touching code." />
      <Card>
        <ApiForm url="/api/os/factory" submitLabel="Generate template" fields={[
          { name: "industry", label: "Industry", required: true, placeholder: "Veterinary" }, { name: "role", label: "Role", required: true, placeholder: "Receptionist" },
          { name: "problem", label: "Problem it solves", type: "textarea", required: true }, { name: "monthlyPriceUsd", label: "Monthly price (USD)", type: "number", defaultValue: 99 },
        ]} />
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Industry templates ({templates.length})</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => <div key={t.key} className="rounded-xl border border-gray-200 p-3 text-sm"><p className="font-medium text-gray-900">{t.industry} — ${t.monthlyPriceUsd}/mo</p><p className="text-xs text-gray-500">{t.employees.join(" · ")}</p><p className="mt-1 text-xs text-gray-600">{t.description}</p></div>)}
        </div>
      </Card>
      {withDef.map((c) => <Card key={c.id}><h3 className="text-sm font-semibold">{c.name} — generated definition</h3><pre className="mt-2 max-h-72 overflow-auto text-xs text-gray-700">{JSON.stringify(c.definition, null, 2)}</pre></Card>)}
    </div>
  );
}
