import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ApiButton from "@/components/os/ApiButton";
import { Badge, Card, PageHeader } from "@/components/os/ui";
import { growthEnabled } from "@/lib/growth/config";
import { humanQueue } from "@/lib/growth/agents/orchestrator";
import type { ReplyPolicy } from "@/lib/growth/agents/reply-agent";

export const dynamic = "force-dynamic";

export default async function GrowthReplies() {
  if (!growthEnabled()) return <PageHeader title="Replies and conversion" subtitle="Growth Engine is disabled." />;
  const [queue, drafts, escalated] = await Promise.all([
    humanQueue(),
    prisma.grReplyDraft.findMany({ where: { status: { in: ["PENDING_APPROVAL", "POLICY_FAILED"] } }, orderBy: { id: "desc" }, take: 50 }),
    prisma.grReply.findMany({ where: { reviewStatus: { in: ["ESCALATED", "NEEDS_REVIEW"] } }, orderBy: { id: "desc" }, take: 20 }),
  ]);
  const replies = await prisma.grReply.findMany({ where: { id: { in: drafts.map((d) => d.replyId ?? 0) } } });
  const companies = await prisma.grCompany.findMany({ where: { id: { in: [...drafts.map((d) => d.companyId), ...escalated.map((e) => e.companyId ?? 0)] } }, select: { id: true, name: true } });
  const name = (id: number | null) => companies.find((c) => c.id === id)?.name ?? "Unknown";
  return (
    <div className="space-y-6">
      <PageHeader title="Replies and conversion" subtitle="The reply and conversion agents draft; you approve the exact text. Pricing comes only from approved figures; contract, technical, legal and discount questions are escalated to you." />
      <Card>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge>{`${queue.outreachDraftsToApprove} outreach drafts`}</Badge><Badge>{`${queue.replyDraftsToApprove} reply drafts`}</Badge><Badge>{`${queue.escalatedToFounder} escalated`}</Badge><Badge>{`${queue.repliesNeedingReview} need review`}</Badge><Badge>{`${queue.qualifiedCompaniesNeedingDecisionMaker} companies need a decision-maker`}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <ApiButton label="Run marketing agent now" url="/api/growth/agent" body={{ agents: ["reply", "conversion", "outreach"] }} />
          <ApiButton label="Approve all policy-passing outreach drafts" url="/api/growth/drafts/approve-all" confirm="Approve every outreach draft that passed policy? Each is bound to its exact content." />
        </div>
      </Card>
      {escalated.length > 0 && <Card><h2 className="text-base font-semibold">Needs you</h2><ul className="mt-2 space-y-3 text-sm">{escalated.map((r) => <li key={r.id}><Link className="text-[var(--primary)]" href={`/admin/growth/${r.companyId}`}>{name(r.companyId)}</Link> <Badge>{r.reviewStatus}</Badge> <span className="text-gray-500">{r.nextAction}</span><pre className="mt-1 whitespace-pre-wrap text-gray-700">{r.body.slice(0, 600)}</pre></li>)}</ul></Card>}
      {drafts.length === 0 && <Card><p className="text-sm text-gray-500">No reply drafts waiting.</p></Card>}
      {drafts.map((d) => {
        const policy = d.flags as unknown as ReplyPolicy | null;
        const orig = replies.find((r) => r.id === d.replyId);
        return (
          <Card key={d.id}>
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold"><Link href={`/admin/growth/${d.companyId}`} className="text-[var(--primary)]">{name(d.companyId)}</Link> — {d.kind.toLowerCase()}</h2><span className="flex gap-2"><Badge>{d.status}</Badge><Badge>{policy?.passed ? "POLICY PASSED" : "POLICY FAILED"}</Badge></span></div>
            <p className="mt-1 text-xs text-gray-500">To {d.toEmail} · {d.model}</p>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div><p className="text-xs font-semibold uppercase text-gray-500">Their message</p><pre className="whitespace-pre-wrap text-sm text-gray-700">{orig?.body.slice(0, 800) ?? "Proactive follow-up (no inbound message)."}</pre></div>
              <div><p className="text-xs font-semibold uppercase text-gray-500">Draft: {d.subject}</p><pre className="whitespace-pre-wrap text-sm text-gray-800">{d.body}</pre>{policy && !policy.passed && <ul className="mt-2 list-disc pl-5 text-sm text-red-700">{policy.issues.map((i) => <li key={i.code}>{i.message}</li>)}</ul>}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {d.status === "PENDING_APPROVAL" && <ApiButton label="Approve and send" url={`/api/growth/reply-drafts/${d.id}/approve`} confirm={`Send this exact message to ${d.toEmail} now?`} />}
              <ApiButton label="Reject" variant="danger" url={`/api/growth/reply-drafts/${d.id}/reject`} body={{ reason: "Rejected by reviewer" }} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
