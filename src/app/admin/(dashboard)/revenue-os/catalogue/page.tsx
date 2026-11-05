import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Badge } from "@/components/os/ui";
import ApiButton from "@/components/os/ApiButton";

export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  const products = await prisma.rvProduct.findMany({ where: { orgId: "ravesoft", deletedAt: null }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="Solution catalogue" subtitle="What RevenueOS agents may recommend. Prices are never invented: unset pricing stays blank until you configure it." />
      {products.length === 0 && (
        <Card><p className="mb-3 text-sm text-gray-600">No products yet. Load the starting catalogue from your brief (no prices, case studies or statistics are included).</p>
          <ApiButton url="/api/os/revenueos/products" method="POST" label="Load starting catalogue" /></Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {products.map((p) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between gap-2"><h2 className="font-semibold">{p.name}</h2><Badge>{p.availability}</Badge></div>
            <p className="text-xs text-gray-500">{p.category} · pricing {p.pricing ? "configured" : "not set"}</p>
            <p className="mt-2 text-sm text-gray-700">Targets: {(p.targetIndustries as string[] | null)?.join(", ") || "—"}</p>
            <p className="mt-1 text-sm text-gray-700">Solves: {(p.problemsSolved as string[] | null)?.join("; ") || "—"}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
