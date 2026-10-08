import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { BRAIN_SECTIONS } from "@/lib/os/brain";
import ApiForm from "@/components/os/ApiForm";
import { Card, PageHeader, Stat, ago } from "@/components/os/ui";

export const dynamic = "force-dynamic";

export default async function BrainPage() {
  const entries = await prisma.osBrainEntry.findMany({ where: { orgId: ORG_ID }, orderBy: [{ section: "asc" }, { title: "asc" }] });
  return (
    <div className="space-y-6">
      <PageHeader title="Knowledge" subtitle="Shared memory. Each agent only retrieves sections in its knowledge sources, and entries restricted to specific departments stay restricted." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Stat label="Documents" value={String(entries.filter((e) => !e.sourceUrl && !["SOPs", "Products", "Customers"].includes(e.section)).length)} />
        <Stat label="Websites" value={String(entries.filter((e) => e.sourceUrl).length)} />
        <Stat label="SOPs" value={String(entries.filter((e) => e.section === "SOPs").length)} />
        <Stat label="Product knowledge" value={String(entries.filter((e) => e.section === "Products").length)} />
        <Stat label="Customer knowledge" value={String(entries.filter((e) => e.section === "Customers").length)} />
        <Stat label="Indexed" value={String(entries.length)} hint="Keyword index · embeddings off" />
      </div>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Add knowledge</h2>
        <ApiForm url="/api/os/brain" submitLabel="Save to Brain" fields={[
          { name: "section", label: "Section", type: "select", options: [...BRAIN_SECTIONS] },
          { name: "title", label: "Title", required: true },
          { name: "content", label: "Content", type: "textarea", required: true },
        ]} />
      </Card>
      {entries.length === 0 && <p className="text-sm text-gray-500">Brain is empty.</p>}
      {BRAIN_SECTIONS.filter((s) => entries.some((e) => e.section === s)).map((s) => (
        <section key={s}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{s}</h2>
          <div className="space-y-2">
            {entries.filter((e) => e.section === s).map((e) => (
              <Card key={e.id}><p className="text-sm font-medium text-gray-900">{e.title}{e.isDemo ? " · DEMO" : ""}</p><p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{e.content}</p><p className="mt-1 text-xs text-gray-400">v{e.version} · {e.createdBy} · {ago(e.updatedAt)}{(e.allowedDepartments as string[] | null)?.length ? ` · restricted to ${(e.allowedDepartments as string[]).join(", ")}` : ""}</p></Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
