import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import ApiButton from "@/components/os/ApiButton";
import { Card, PageHeader } from "@/components/os/ui";

export const dynamic = "force-dynamic";

export default async function BriefPage() {
  const [brief, plan] = await Promise.all([
    prisma.osBrief.findFirst({ where: { orgId: ORG_ID, kind: "DAILY" }, orderBy: { forDate: "desc" } }),
    prisma.osBrief.findFirst({ where: { orgId: ORG_ID, kind: "REVENUE_PLAN" }, orderBy: { forDate: "desc" } }),
  ]);
  const sections = (brief?.content as { sections?: Record<string, string[]> } | null)?.sections ?? {};
  const priorities = (plan?.content as { priorities?: string[] } | null)?.priorities ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Daily executive brief" subtitle={brief ? `Generated for ${brief.forDate}` : "No brief generated yet."} actions={<ApiButton label="Generate now" variant="primary" url="/api/os/brief" />} />
      {priorities.length > 0 && <Card><h2 className="mb-2 text-sm font-semibold">Today&apos;s revenue priorities ({plan?.forDate})</h2><ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">{priorities.map((p, i) => <li key={i}>{p}</li>)}</ol></Card>}
      {Object.entries(sections).map(([title, lines]) => (
        <Card key={title}><h2 className="mb-2 text-sm font-semibold text-gray-900">{title}</h2><ul className="space-y-1 text-sm text-gray-700">{lines.map((l, i) => <li key={i} className={l.startsWith("INSUFFICIENT DATA") ? "text-amber-700" : ""}>{l}</li>)}</ul></Card>
      ))}
    </div>
  );
}
