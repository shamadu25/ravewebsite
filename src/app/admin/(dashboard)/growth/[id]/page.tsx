import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ApiForm from "@/components/os/ApiForm";
import ApiButton from "@/components/os/ApiButton";
import { Badge, Card, PageHeader, ago } from "@/components/os/ui";
import { growthEnabled } from "@/lib/growth/config";
import { suppressionReason } from "@/lib/growth/suppression";

export const dynamic = "force-dynamic";

export default async function Prospect({ params }: { params: Promise<{ id: string }> }) {
  if (!growthEnabled()) notFound();
  const id = Number((await params).id);
  const c = await prisma.grCompany.findUnique({ where: { id }, include: { evidence: true, people: { include: { contacts: true } }, contacts: true, drafts: { orderBy: { id: "desc" } } } });
  if (!c) notFound();
  const [outbox, replies] = await Promise.all([prisma.grOutbox.findMany({ where: { companyId: id }, orderBy: { id: "desc" } }), prisma.grReply.findMany({ where: { companyId: id }, orderBy: { id: "desc" } })]);
  const sup = await Promise.all(c.contacts.map((x) => suppressionReason(x.email, c.domain)));
  const breakdown = (c.scoreBreakdown as { components?: Array<{ key: string; max: number; points: number; why: string }> } | null)?.components ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title={c.name} subtitle={`${c.domain} · ${c.category ?? ""} · researched ${ago(c.researchedAt)}`} actions={<Link href="/admin/growth" className="text-sm text-[var(--primary)]">← All</Link>} />
      <Card>
        <div className="flex flex-wrap gap-2"><Badge>{c.status}</Badge>{c.outreachDisabled && <Badge>BLOCKED</Badge>}{c.needsReview && <Badge>PENDING</Badge>}</div>
        <p className="mt-2 text-sm">Fit <b>{c.fitScore ?? "—"}</b> · Buying readiness <b>{c.readinessScore ?? "—"}</b> (separate) · Confidence {c.confidence ?? "—"}</p>
        <p className="mt-1 text-sm text-gray-600">{c.decisionReason}</p>
        {c.useCase && <p className="mt-1 text-sm">Suggested use case: {c.useCase}</p>}
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">{breakdown.map((b) => <li key={b.key}>{b.key}: {b.points}/{b.max} <span className="text-gray-500">— {b.why}</span></li>)}</ul>
      </Card>
      <Card><h2 className="mb-2 text-base font-semibold">Evidence</h2>{c.evidence.length === 0 ? <p className="text-sm text-gray-500">No sourced evidence.</p> : <ul className="list-disc pl-5 text-sm">{c.evidence.map((e) => <li key={e.id}>{e.claim} — <a className="text-[var(--primary)]" href={e.sourceUrl} target="_blank" rel="noreferrer">{e.sourceUrl}</a> <span className="text-gray-500">({e.signal}, {ago(e.capturedAt)})</span></li>)}</ul>}</Card>
      <Card>
        <h2 className="mb-2 text-base font-semibold">Decision-makers & contacts</h2>
        {c.people.map((p) => <div key={p.id} className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm"><span><b>{p.name}</b>, {p.role} <a className="text-[var(--primary)]" href={p.sourceUrl} target="_blank" rel="noreferrer">source</a> {p.verified ? <Badge>ACTIVE</Badge> : <Badge>DRAFT</Badge>}{p.contacts.map((k) => <span key={k.id} className="ml-2">{k.email} <Badge>{k.status}</Badge></span>)}</span>{p.contacts.length === 0 && <ApiButton label="Find & verify email (Snov.io)" size="sm" url={`/api/growth/people/${p.id}/enrich`} />}</div>)}
        <details className="mt-2"><summary className="cursor-pointer text-sm text-[var(--primary)]">Add a decision-maker (source required)</summary><div className="mt-2"><ApiForm url={`/api/growth/companies/${c.id}/people`} submitLabel="Add" extra={{ verified: true }} fields={[{ name: "name", label: "Full name", required: true }, { name: "role", label: "Role", required: true }, { name: "sourceUrl", label: "Source URL (where you confirmed them)", required: true }]} /></div></details>
      </Card>
      <Card>
        <h2 className="mb-2 text-base font-semibold">Drafts & approvals</h2>
        {c.contacts.filter((k, i) => k.status === "VERIFIED" && !sup[i]).map((k) => <div key={k.id} className="mb-2 flex gap-2">{[1, 2, 3].map((t) => <ApiButton key={t} label={`Draft touch ${t} → ${k.email}`} size="sm" variant="secondary" url="/api/growth/drafts" body={{ mode: "generate", companyId: c.id, contactId: k.id, touch: t }} />)}</div>)}
        <table className="w-full text-left text-sm"><tbody>{c.drafts.map((d) => <tr key={d.id} className="border-t border-gray-100"><td className="py-1">touch {d.touch} v{d.version}</td><td>{d.subject}</td><td><Badge>{d.status}</Badge></td><td>{ago(d.createdAt)}</td></tr>)}</tbody></table>
      </Card>
      <Card><h2 className="mb-2 text-base font-semibold">Send timeline</h2><ul className="text-sm">{outbox.map((o) => <li key={o.id}>#{o.id} → {o.toEmail} <Badge>{o.status}</Badge> {o.cancelReason ?? o.error ?? ""} <span className="text-gray-500">{o.sentAt ? `sent ${ago(o.sentAt)}` : `due ${ago(o.scheduledAt)}`}</span></li>)}{outbox.length === 0 && <li className="text-gray-500">Nothing queued.</li>}</ul></Card>
      <Card><h2 className="mb-2 text-base font-semibold">Replies</h2><ul className="text-sm">{replies.map((r) => <li key={r.id} className="mb-2"><Badge>{r.category}</Badge> {Math.round(r.confidence * 100)}% · {r.nextAction}<p className="text-gray-600">{r.body.slice(0, 300)}</p></li>)}{replies.length === 0 && <li className="text-gray-500">No replies recorded.</li>}</ul></Card>
      <Card><h2 className="mb-2 text-base font-semibold">Suppression</h2><ApiButton label="Do not contact this domain" variant="danger" url="/api/growth/suppression" body={{ kind: "DOMAIN", value: c.domain, reason: "Disabled by operator" }} confirm="Suppress this domain and cancel all scheduled messages?" /></Card>
    </div>
  );
}
