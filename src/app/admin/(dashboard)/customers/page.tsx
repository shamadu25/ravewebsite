import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import ApiButton from "@/components/os/ApiButton";
import { Badge, Card, PageHeader, Stat, ago, centsToUsd } from "@/components/os/ui";

export const dynamic = "force-dynamic";
const HEALTHS = ["ALL", "GREEN", "YELLOW", "RED"];

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ health?: string; q?: string }> }) {
  const { health, q } = await searchParams;
  const [all, expansion, lastTasks] = await Promise.all([
    prisma.osCustomer.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "desc" }, take: 500 }),
    prisma.osOpportunity.count({ where: { orgId: ORG_ID, source: "expansion", stage: { notIn: ["WON", "LOST"] } } }),
    prisma.osTask.findMany({ where: { orgId: ORG_ID, customerId: { not: null } }, orderBy: { id: "desc" }, take: 500, select: { customerId: true, agent: { select: { name: true } } } }),
  ]);
  const rows = all.filter((c) => (!health || health === "ALL" || c.health === health) && (!q || c.name.toLowerCase().includes(q.toLowerCase())));
  const active = all.filter((c) => c.status === "ACTIVE").length, churned = all.filter((c) => c.status === "CHURNED").length;
  const atRisk = all.filter((c) => c.health === "RED" && c.status !== "CHURNED").length;
  const employeeFor = (id: number) => lastTasks.find((t) => t.customerId === id)?.agent.name ?? "—";
  const usage = (c: (typeof all)[number]) => (c.usage30d == null ? "No feed" : c.usagePrev30d ? `${c.usage30d} (${c.usage30d >= c.usagePrev30d ? "+" : ""}${Math.round((c.usage30d / c.usagePrev30d - 1) * 100)}%)` : String(c.usage30d));

  return (
    <div className="space-y-8">
      <PageHeader title="Customers" subtitle="Health uses only the signals available; missing feeds are named, never assumed healthy." actions={<ApiButton label="Run health scan" url="/api/os/agents/customer-health-agent/run" body={{}} result="taskQueued" />} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Total customers" value={String(all.length)} /><Stat label="Active" value={String(active)} /><Stat label="At risk" value={String(atRisk)} tone={atRisk ? "bad" : undefined} /><Stat label="Churned" value={String(churned)} /><Stat label="Expansion opportunities" value={String(expansion)} />
      </div>
      <form className="flex flex-wrap items-center gap-2">
        {HEALTHS.map((h) => <Link key={h} href={h === "ALL" ? "/admin/customers" : `/admin/customers?health=${h}`} className={`rounded-full border px-3 py-1 text-[12px] ${(health ?? "ALL") === h ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white text-[var(--muted)]"}`}>{h === "ALL" ? "All" : h.charAt(0) + h.slice(1).toLowerCase()}</Link>)}
        <input name="q" defaultValue={q} placeholder="Filter by name…" aria-label="Filter customers" className="ml-auto h-9 rounded-[10px] border border-[var(--border)] bg-white px-3 text-[13px]" />
      </form>
      {all.length === 0 ? (
        <Card className="text-center"><p className="text-[15px] font-medium">No customers yet</p><p className="mt-1 text-[13px] text-[var(--muted)]">A customer is created when a payment is recorded on a deal or arrives from a product.</p><Link href="/admin/revenue" className="mt-3 inline-block text-[13px] font-medium text-[var(--primary)]">Go to Leads & Sales →</Link></Card>
      ) : (
        <div className="os-card overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead><tr className="border-b border-[var(--border)] text-left text-[12px] text-[var(--muted)]">{["Customer", "Product", "MRR", "Health", "Usage (30d)", "Last activity", "AI Employee"].map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-[var(--border)]/60 last:border-0 hover:bg-[var(--background)]">
                  <td className="px-4 py-3"><p className="font-medium">{c.name}{c.isDemo ? <span className="ml-1 text-[10px] text-[var(--muted)]">DEMO</span> : null}</p><p className="text-[12px] text-[var(--muted)]">{c.status.toLowerCase()}</p></td>
                  <td className="px-4 py-3">{c.businessUnit}</td><td className="px-4 py-3 tabular-nums">{centsToUsd(c.mrrCents)}</td>
                  <td className="px-4 py-3"><Badge>{c.health}</Badge></td><td className="px-4 py-3 text-[13px]">{usage(c)}</td>
                  <td className="px-4 py-3 text-[13px] text-[var(--muted)]">{c.lastActiveAt ? ago(c.lastActiveAt) : "No data"}</td><td className="px-4 py-3 text-[13px]">{employeeFor(c.id)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)]">No customers match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {all.filter((c) => (c.onboarding as { steps?: unknown[] } | null)?.steps?.length && c.status === "ONBOARDING").map((c) => {
        const steps = (c.onboarding as { steps: Array<{ key: string; label: string; status: string; note?: string }> }).steps;
        return (
          <Card key={c.id}>
            <h2 className="mb-2 text-[15px] font-semibold">Onboarding · {c.name}</h2>
            <ul className="grid gap-1.5 text-[13px] sm:grid-cols-2">{steps.map((s) => <li key={s.key} className="flex items-center gap-2"><Badge>{s.status === "DONE" ? "COMPLETED" : s.status === "BLOCKED" ? "BLOCKED" : "PENDING"}</Badge><span>{s.label}</span>{s.status !== "DONE" && s.note && <span className="text-[var(--muted)]">— {s.note}</span>}</li>)}</ul>
          </Card>
        );
      })}
    </div>
  );
}
