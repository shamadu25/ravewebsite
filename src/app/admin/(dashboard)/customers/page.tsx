import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import ApiButton from "@/components/os/ApiButton";
import { Badge, Card, PageHeader, centsToUsd } from "@/components/os/ui";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.osCustomer.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, take: 200 });
  return (
    <div className="space-y-4">
      <PageHeader title="Customers" subtitle="Created when a payment is recorded. Health uses only the signals available; missing feeds are listed rather than assumed." actions={<ApiButton label="Run health scan" url="/api/os/agents/customer-health-agent/run" body={{}} result="taskQueued" />} />
      {customers.length === 0 && <Card><p className="text-sm text-gray-500">No customers yet. Record a payment on an opportunity to create one.</p></Card>}
      {customers.map((c) => {
        const steps = (c.onboarding as { steps?: Array<{ key: string; label: string; status: string; note?: string }> } | null)?.steps ?? [];
        const hr = c.healthReasons as { reasons?: string[]; missing?: string[] } | null;
        return (
          <Card key={c.id}>
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-gray-900">{c.name}{c.isDemo ? " · DEMO" : ""}</h2><span className="flex items-center gap-2"><Badge>{c.health}</Badge><Badge>{c.status}</Badge><span className="text-sm text-gray-700">{centsToUsd(c.mrrCents)}/mo</span></span></div>
            <p className="text-xs text-gray-500">{c.businessUnit} · {c.revenueEngine.replace(/_/g, " ")}</p>
            {hr?.reasons?.length ? <p className="mt-1 text-xs text-gray-600">{hr.reasons.join("; ")}</p> : null}
            {hr?.missing?.length ? <p className="mt-1 text-xs text-amber-700">INSUFFICIENT DATA: {hr.missing.join("; ")}</p> : null}
            {steps.length > 0 && (
              <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">{steps.map((s) => <li key={s.key} className="flex items-center gap-2"><Badge>{s.status === "DONE" ? "COMPLETED" : s.status === "BLOCKED" ? "BLOCKED" : "PENDING"}</Badge><span className="text-gray-700">{s.label}</span>{s.status !== "DONE" && s.note && <span className="text-gray-400">— {s.note}</span>}</li>)}</ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
