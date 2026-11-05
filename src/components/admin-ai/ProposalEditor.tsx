"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton, call, inputCls, primaryCls, secondaryCls } from "./controls";

interface Item { key: string; complexity?: "LOW" | "MEDIUM" | "HIGH"; quantity?: number }
interface Options { currency?: string; additionalDevHours?: number; trainingSessions?: number; optionalServices?: string[]; manualDiscountPercent?: number; manualDiscountReason?: string; priceOverrides?: Record<string, number> }
interface Sections { executiveSummary: string; understanding: string; challenges: string[]; timeline: string; expectedOutcomes: string[]; assumptions: string[]; exclusions: string[]; dependencies: string[]; paymentTerms: string; acceptance: string }

interface Props {
  proposalId: number; status: string;
  quoteInput: { items: Item[]; options: Options };
  sections: Sections;
  catalogue: Array<{ key: string; name: string; priced: boolean }>;
  currencies: string[];
  optionalServices: Array<{ key: string; name: string }>;
  can: { approve: boolean; pricing: boolean };
  quoteComplete: boolean;
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export default function ProposalEditor({ proposalId, status, quoteInput, sections, catalogue, currencies, optionalServices, can, quoteComplete }: Props) {
  const router = useRouter();
  const url = `/api/ai-automation/admin/proposals/${proposalId}`;
  const [items, setItems] = useState<Item[]>(quoteInput.items);
  const [opt, setOpt] = useState<Options>(quoteInput.options ?? {});
  const [sec, setSec] = useState({ ...sections, challenges: sections.challenges.join("\n"), expectedOutcomes: sections.expectedOutcomes.join("\n"), assumptions: sections.assumptions.join("\n"), exclusions: sections.exclusions.join("\n"), dependencies: sections.dependencies.join("\n") });
  const [note, setNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const closed = ["ACCEPTED", "DECLINED"].includes(status);

  async function save(body: Record<string, unknown>) {
    const r = await call(url, "POST", { action: "edit", note: note || undefined, ...body });
    setMsg(r.ok ? { ok: true, text: "Saved as a new version. Previous approval (if any) was cleared." } : r);
    if (r.ok) router.refresh();
  }
  const setItem = (i: number, p: Partial<Item>) => setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  const num = (v: string) => (v === "" ? undefined : Number(v));
  const label = "mb-1 block text-xs font-medium text-gray-600";

  return (
    <div className="space-y-8 text-sm">
      <section aria-labelledby="actions-h">
        <h3 id="actions-h" className="mb-3 font-semibold">Actions</h3>
        <div className="flex flex-wrap items-center gap-2">
          {can.approve && status === "AWAITING_APPROVAL" && <ActionButton variant="primary" label="Approve proposal" url={url} body={{ action: "approve" }} confirm="Approve this proposal? It can then be emailed to the customer." />}
          {can.approve && status === "APPROVED" && <ActionButton variant="primary" label="Send to customer" url={url} body={{ action: "send" }} confirm="Email this proposal to the customer now?" />}
          {can.approve && status === "SENT" && <ActionButton label="Resend proposal" url={url} body={{ action: "resend" }} confirm="Resend this proposal email?" />}
          <ActionButton label="Regenerate PDF" url={url} body={{ action: "regenerate_pdf" }} />
          <a className={secondaryCls} href={`/api/ai-automation/admin/proposals/${proposalId}/pdf`}>Download PDF</a>
          {["SENT", "APPROVED"].includes(status) && <><ActionButton label="Mark: negotiating" url={url} body={{ action: "outcome", outcome: "NEGOTIATION" }} /><ActionButton label="Mark: accepted" url={url} body={{ action: "outcome", outcome: "ACCEPTED" }} confirm="Record that the customer accepted? This opens an implementation record." /></>}
          {!closed && <ActionButton label="Mark: declined" variant="danger" url={url} body={{ action: "outcome", outcome: "DECLINED", reason: "Customer declined proposal" }} confirm="Record that the customer declined? The lead becomes LOST." />}
        </div>
        {can.approve && !closed && (
          <div className="mt-3 flex flex-wrap items-end gap-2"><label className="min-w-[240px] flex-1"><span className={label}>Reject with reason</span><input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className={inputCls} /></label><ActionButton variant="danger" label="Reject" url={url} body={{ action: "reject", reason: rejectReason || "Rejected" }} /></div>
        )}
        {!quoteComplete && <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs text-amber-900">Pricing is incomplete, so this proposal cannot be approved or sent. Enter the missing prices in Solutions / Pricing, then press “Recalculate” below.</p>}
      </section>

      <section aria-labelledby="quote-h">
        <h3 id="quote-h" className="mb-1 font-semibold">Services &amp; pricing</h3>
        <p className="mb-3 text-xs text-gray-500">Prices come only from approved catalogue records and pricing rules. Editing recalculates the quote and creates a new version.</p>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_80px_1.2fr_auto] sm:items-end">
              <label className="col-span-2 sm:col-span-1"><span className={label}>Solution</span><select value={it.key} onChange={(e) => setItem(i, { key: e.target.value })} className={inputCls}>{catalogue.map((c) => <option key={c.key} value={c.key}>{c.name}{c.priced ? "" : " (no approved price)"}</option>)}</select></label>
              <label><span className={label}>Complexity</span><select value={it.complexity ?? "MEDIUM"} onChange={(e) => setItem(i, { complexity: e.target.value as Item["complexity"] })} className={inputCls}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></label>
              <label><span className={label}>Qty</span><input type="number" min={1} value={it.quantity ?? 1} onChange={(e) => setItem(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} className={inputCls} /></label>
              <label><span className={label}>Override price {can.pricing ? "" : "(restricted)"}</span><input type="number" min={0} step="any" disabled={!can.pricing} placeholder="catalogue" value={opt.priceOverrides?.[it.key] ?? ""} onChange={(e) => setOpt((o) => { const p = { ...(o.priceOverrides ?? {}) }; if (e.target.value === "") delete p[it.key]; else p[it.key] = Number(e.target.value); return { ...o, priceOverrides: p }; })} className={inputCls} /></label>
              <button type="button" className={secondaryCls} onClick={() => setItems((c) => c.filter((_, x) => x !== i))} aria-label={`Remove ${it.key}`}>Remove</button>
            </div>
          ))}
          <button type="button" className={secondaryCls} onClick={() => setItems((c) => [...c, { key: catalogue[0]?.key ?? "", complexity: "MEDIUM", quantity: 1 }])}>+ Add service</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <label><span className={label}>Currency</span><select value={opt.currency ?? "USD"} onChange={(e) => setOpt({ ...opt, currency: e.target.value })} className={inputCls}>{currencies.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label><span className={label}>Additional dev hours</span><input type="number" min={0} value={opt.additionalDevHours ?? ""} onChange={(e) => setOpt({ ...opt, additionalDevHours: num(e.target.value) })} className={inputCls} /></label>
          <label><span className={label}>Training sessions</span><input type="number" min={0} value={opt.trainingSessions ?? ""} onChange={(e) => setOpt({ ...opt, trainingSessions: num(e.target.value) })} placeholder="rule default" className={inputCls} /></label>
          <label><span className={label}>Discount %</span><input type="number" min={0} max={100} step="any" value={opt.manualDiscountPercent ?? ""} onChange={(e) => setOpt({ ...opt, manualDiscountPercent: num(e.target.value) })} className={inputCls} /></label>
          <label className="sm:col-span-2"><span className={label}>Discount reason</span><input value={opt.manualDiscountReason ?? ""} onChange={(e) => setOpt({ ...opt, manualDiscountReason: e.target.value })} maxLength={120} className={inputCls} /></label>
        </div>
        {optionalServices.length > 0 && (
          <fieldset className="mt-3"><legend className={label}>Optional services (shown, not totalled)</legend><div className="flex flex-wrap gap-3">{optionalServices.map((o) => <label key={o.key} className="flex items-center gap-2"><input type="checkbox" checked={(opt.optionalServices ?? []).includes(o.key)} onChange={(e) => setOpt({ ...opt, optionalServices: e.target.checked ? [...(opt.optionalServices ?? []), o.key] : (opt.optionalServices ?? []).filter((k) => k !== o.key) })} />{o.name}</label>)}</div></fieldset>
        )}
        <div className="mt-4 flex flex-wrap items-end gap-2"><label className="min-w-[240px] flex-1"><span className={label}>Change note (kept in version history)</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} className={inputCls} /></label><button className={primaryCls} disabled={closed || items.length === 0} onClick={() => save({ quoteInput: { items, options: opt } })}>Recalculate &amp; save version</button></div>
      </section>

      <section aria-labelledby="text-h">
        <h3 id="text-h" className="mb-3 font-semibold">Proposal wording</h3>
        <div className="space-y-3">
          {([["executiveSummary", "Executive summary"], ["understanding", "Understanding of the business"], ["timeline", "Timeline"], ["paymentTerms", "Payment terms"], ["acceptance", "Acceptance instructions"]] as const).map(([k, l]) => (
            <label key={k} className="block"><span className={label}>{l}</span><textarea rows={k === "executiveSummary" || k === "understanding" ? 5 : 3} value={sec[k]} onChange={(e) => setSec({ ...sec, [k]: e.target.value })} className={inputCls} /></label>
          ))}
          {([["challenges", "Identified challenges (one per line)"], ["expectedOutcomes", "Expected outcomes"], ["assumptions", "Assumptions"], ["exclusions", "Exclusions"], ["dependencies", "Dependencies"]] as const).map(([k, l]) => (
            <label key={k} className="block"><span className={label}>{l}</span><textarea rows={4} value={sec[k]} onChange={(e) => setSec({ ...sec, [k]: e.target.value })} className={inputCls} /></label>
          ))}
        </div>
        <button className={`${primaryCls} mt-3`} disabled={closed} onClick={() => save({ sections: { executiveSummary: sec.executiveSummary, understanding: sec.understanding, timeline: sec.timeline, paymentTerms: sec.paymentTerms, acceptance: sec.acceptance, challenges: lines(sec.challenges), expectedOutcomes: lines(sec.expectedOutcomes), assumptions: lines(sec.assumptions), exclusions: lines(sec.exclusions), dependencies: lines(sec.dependencies) } })}>Save wording as new version</button>
      </section>
      {msg && <p role="status" className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-red-700 break-all"}>{msg.text}</p>}
    </div>
  );
}
