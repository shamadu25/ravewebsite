import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { getFunnels } from "@/lib/os/products";
import { Card, PageHeader, Stat, centsToUsd } from "@/components/os/ui";

export const dynamic = "force-dynamic";
const weekAgo = () => new Date(Date.now() - 7 * 86400_000);
const UNITS = ["CLIQPOS", "KOVABOT", "HMS", "RESTOVAX"];

export default async function ProductsPage() {
  const [funnels, customers, recent] = await Promise.all([
    getFunnels(),
    prisma.osCustomer.groupBy({ by: ["businessUnit", "health"], where: { orgId: ORG_ID, status: { not: "CHURNED" } }, _count: true, _sum: { mrrCents: true } }),
    prisma.osProductEvent.count({ where: { orgId: ORG_ID, occurredAt: { gte: weekAgo() } } }),
  ]);
  const feedConnected = Boolean(process.env.PRODUCT_WEBHOOK_SECRET);
  return (
    <div className="space-y-6">
      <PageHeader title="Product intelligence" subtitle="Registration → activation → payment, per product. Data arrives through the signed product webhook." />
      {!feedConnected && <Card className="border-amber-200"><p className="text-sm text-amber-800">NOT CONNECTED — set PRODUCT_WEBHOOK_SECRET and have each product POST signed events to /api/os/webhooks/product (see the README section in the summary).</p></Card>}
      <p className="text-xs text-gray-500">{recent} product event(s) received in the last 7 days.</p>
      {UNITS.map((u) => {
        const f = funnels.find((x) => x.businessUnit === u);
        const rows = customers.filter((c) => c.businessUnit === u);
        const mrr = rows.reduce((n, r) => n + (r._sum.mrrCents ?? 0), 0);
        const count = rows.reduce((n, r) => n + r._count, 0);
        return (
          <Card key={u}>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">{u}</h2>
            {f ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Stat label="Registered" value={String(f.registered)} /><Stat label="Activated" value={String(f.activated)} hint={f.regToActPct == null ? undefined : `${f.regToActPct}% of registered`} />
                  <Stat label="Paid" value={String(f.paid)} hint={f.actToPaidPct == null ? undefined : `${f.actToPaidPct}% of activated`} /><Stat label="Customers" value={String(count)} /><Stat label="MRR" value={centsToUsd(mrr)} />
                </div>
                <p className="mt-3 text-sm text-gray-700">Biggest drop-off: <b>{f.biggestDrop}</b></p>
              </>
            ) : <p className="text-sm text-gray-500">INSUFFICIENT DATA — no events received for this product yet.{count > 0 ? ` ${count} customer(s), ${centsToUsd(mrr)} MRR recorded from other sources.` : ""}</p>}
          </Card>
        );
      })}
    </div>
  );
}
