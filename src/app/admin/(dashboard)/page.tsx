import { prisma } from "@/lib/prisma";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getKpis() {
  const todayStart = startOfToday();

  const [visitorsToday, conversationsToday, totalLeads, leadScores, pendingHandoffs] = await Promise.all([
    prisma.visitor.count({ where: { lastSeenAt: { gte: todayStart } } }),
    prisma.conversation.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.lead.count(),
    prisma.leadScore.findMany({
      distinct: ["leadId"],
      orderBy: { computedAt: "desc" },
      select: { leadId: true, level: true },
    }),
    prisma.conversation.count({ where: { status: "human_handoff" } }),
  ]);

  // findMany + distinct on leadId doesn't guarantee "latest" per group in all DBs reliably
  // without an explicit order scope per group, so recompute the latest score per lead here.
  const latestByLead = new Map<number, string>();
  for (const score of leadScores) {
    if (!latestByLead.has(score.leadId)) {
      latestByLead.set(score.leadId, score.level);
    }
  }

  const qualifiedLeads = [...latestByLead.values()].filter((level) =>
    ["qualified", "sales_qualified", "hot"].includes(level)
  ).length;
  const hotLeads = [...latestByLead.values()].filter((level) => level === "hot").length;

  return { visitorsToday, conversationsToday, totalLeads, qualifiedLeads, hotLeads, pendingHandoffs };
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const kpis = await getKpis();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Visitors Today" value={kpis.visitorsToday} />
        <KpiCard label="Conversations Today" value={kpis.conversationsToday} />
        <KpiCard label="Leads Captured" value={kpis.totalLeads} />
        <KpiCard label="Qualified Leads" value={kpis.qualifiedLeads} />
        <KpiCard label="Hot Leads" value={kpis.hotLeads} />
        <KpiCard label="Pending Handoffs" value={kpis.pendingHandoffs} />
      </div>
    </div>
  );
}
