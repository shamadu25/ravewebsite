import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ApiForm from "@/components/os/ApiForm";
import ApiButton from "@/components/os/ApiButton";
import { Badge, Card, PageHeader } from "@/components/os/ui";
import { growthEnabled } from "@/lib/growth/config";
import type { PolicyResult } from "@/lib/growth/policy";

export const dynamic = "force-dynamic";

export default async function GrowthApprovals() {
  if (!growthEnabled()) return <PageHeader title="Growth approvals" subtitle="Growth Engine is disabled." />;
  const drafts = await prisma.grDraft.findMany({ where: { status: { in: ["PENDING_APPROVAL", "POLICY_FAILED"] } }, orderBy: { id: "desc" }, take: 50, include: { company: { include: { evidence: true, people: true } } } });
  const sequences = await prisma.grDraft.findMany({ where: { id: { in: drafts.map((d) => d.id) } }, select: { id: true } });
  void sequences;
  return (
    <div className="space-y-6">
      <PageHeader title="Growth approval queue" subtitle="You approve one exact version: recipient, sender, subject and body. Editing creates a new version and voids any earlier approval. Every touch needs its own approval." />
      {drafts.length === 0 && <Card><p className="text-sm text-gray-500">Nothing waiting.</p></Card>}
      {drafts.map((d) => {
        const policy = d.policyResult as unknown as PolicyResult;
        const ids = (d.evidenceIds as number[]) ?? [];
        const used = d.company.evidence.filter((e) => ids.includes(e.id));
        return (
          <Card key={d.id}>
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold"><Link href={`/admin/growth/${d.companyId}`} className="text-[var(--primary)]">{d.company.name}</Link> — touch {d.touch}, v{d.version}</h2><span className="flex gap-2"><Badge>{d.status}</Badge><Badge>{policy.passed ? "POLICY PASSED" : "POLICY FAILED"}</Badge></span></div>
            <p className="mt-1 text-xs text-gray-500">To {d.toEmail} · from {d.senderIdentity} · {d.model} · prompt {d.promptVersion} · fit {d.company.fitScore ?? "—"} / readiness {d.company.readinessScore ?? "—"}</p>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div><p className="text-xs font-semibold uppercase text-gray-500">Subject</p><p className="text-sm">{d.subject}</p><p className="mt-2 text-xs font-semibold uppercase text-gray-500">Body</p><pre className="whitespace-pre-wrap text-sm text-gray-800">{d.body}</pre></div>
              <div className="text-sm"><p className="text-xs font-semibold uppercase text-gray-500">Evidence used</p>{used.length ? <ul className="list-disc pl-5">{used.map((e) => <li key={e.id}>{e.claim} <a className="text-[var(--primary)]" href={e.sourceUrl} target="_blank" rel="noreferrer">source</a></li>)}</ul> : <p className="text-gray-500">None cited.</p>}
                {!policy.passed && <><p className="mt-3 text-xs font-semibold uppercase text-red-700">Policy issues</p><ul className="list-disc pl-5 text-red-700">{policy.issues.map((i) => <li key={i.code}>{i.message}</li>)}</ul></>}
                <p className="mt-3 text-xs text-gray-500">Follow-ups (touch 2–3) are drafted and approved separately after this message is sent.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-start gap-3">
              {d.status === "PENDING_APPROVAL" && <ApiButton label={`Approve v${d.version} exactly as shown`} url={`/api/growth/drafts/${d.id}/approve`} confirm={`Approve this exact message to ${d.toEmail}?`} />}
              <ApiButton label="Reject" variant="danger" url={`/api/growth/drafts/${d.id}/reject`} body={{ reason: "Rejected by reviewer" }} />
            </div>
            <details className="mt-3"><summary className="cursor-pointer text-sm text-[var(--primary)]">Edit (creates a new version)</summary><div className="mt-2"><ApiForm url="/api/growth/drafts" submitLabel="Save as new version" extra={{ mode: "edit", draftId: d.id }} fields={[{ name: "subject", label: "Subject", required: true, defaultValue: d.subject }, { name: "body", label: "Body", type: "textarea", required: true, defaultValue: d.body }]} /></div></details>
          </Card>
        );
      })}
    </div>
  );
}
