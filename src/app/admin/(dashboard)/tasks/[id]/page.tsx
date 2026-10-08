import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ApiButton from "@/components/os/ApiButton";
import { Badge, Card, PageHeader, ago } from "@/components/os/ui";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await prisma.osTask.findUnique({ where: { id: Number(id) }, include: { agent: true, traces: { orderBy: { seq: "asc" } }, approvals: true } });
  if (!task) notFound();
  const url = `/api/os/tasks/${task.id}`;
  return (
    <div className="space-y-6">
      <PageHeader
        title={`#${task.id} ${task.title}`}
        subtitle={`${task.agent.name} · priority ${task.priority} · created ${ago(task.createdAt)} · retries ${task.retryCount} · cost $${task.costUsd.toFixed(4)}`}
        actions={<><Badge>{task.status}</Badge>{["FAILED", "CANCELLED"].includes(task.status) && <ApiButton label="Retry" variant="primary" url={url} body={{ action: "retry" }} />}{!["COMPLETED", "CANCELLED", "FAILED"].includes(task.status) && <ApiButton label="Cancel" variant="danger" url={url} body={{ action: "cancel" }} />}</>}
      />
      {task.error && <Card className="border-red-200"><p className="text-sm font-medium text-red-700">{task.error}</p>{task.deadLetter && <p className="mt-1 text-xs text-gray-500">Retries exhausted — moved to the dead-letter queue and escalated as an alert.</p>}</Card>}
      {task.approvals.length > 0 && <Card><h2 className="mb-2 text-sm font-semibold">Approvals</h2>{task.approvals.map((a) => <p key={a.id} className="text-sm">#{a.id} {a.title} — <Badge>{a.status}</Badge></p>)}</Card>}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Execution trace</h2>
        <p className="mb-3 text-xs text-gray-500">Decision summaries and tool calls only — hidden model reasoning is never stored.</p>
        <ol className="space-y-2 text-sm">
          {task.traces.map((tr) => (
            <li key={tr.id} className="rounded-lg border border-gray-100 p-2">
              <span className="mr-2 text-[11px] font-semibold uppercase text-gray-500">{tr.kind}</span><span className="text-gray-800">{tr.summary}</span>
              {tr.data != null && <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-[11px] text-gray-600">{JSON.stringify(tr.data, null, 1)}</pre>}
            </li>
          ))}
          {task.traces.length === 0 && <li className="text-gray-500">No trace recorded yet.</li>}
        </ol>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-2 text-sm font-semibold">Input</h2><pre className="max-h-64 overflow-auto text-xs text-gray-700">{JSON.stringify(task.input, null, 2)}</pre></Card>
        <Card><h2 className="mb-2 text-sm font-semibold">Output</h2><pre className="max-h-64 overflow-auto text-xs text-gray-700">{JSON.stringify(task.output, null, 2)}</pre></Card>
      </div>
    </div>
  );
}
