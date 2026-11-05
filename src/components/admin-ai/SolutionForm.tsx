"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { call, inputCls, primaryCls } from "./controls";

interface Sol { key: string; name: string; description: string; problemsSolved: string[]; capabilities: string[]; deliverables: string[]; integrations: string[]; dependencies: string[]; complexityLevels: string[]; defaultComplexity: string; active: boolean; basePrice: number | null; pricingMethod: string; estimatedHours: number | null; deliveryWeeks: number | null; monthlyMaintenance: number | null; industries: Array<{ slug: string; priority: number }> }

const toLines = (a: string[]) => a.join("\n");
const fromLines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const nullableNum = (s: string) => (s.trim() === "" ? null : Number(s));

export default function SolutionForm({ sol, canPrice, allIndustries }: { sol: Sol; canPrice: boolean; allIndustries: Array<{ slug: string; name: string }> }) {
  const router = useRouter();
  const [f, setF] = useState({ name: sol.name, description: sol.description, problemsSolved: toLines(sol.problemsSolved), capabilities: toLines(sol.capabilities), deliverables: toLines(sol.deliverables), integrations: sol.integrations.join(", "), dependencies: toLines(sol.dependencies), defaultComplexity: sol.defaultComplexity, active: sol.active, basePrice: sol.basePrice?.toString() ?? "", pricingMethod: sol.pricingMethod, estimatedHours: sol.estimatedHours?.toString() ?? "", deliveryWeeks: sol.deliveryWeeks?.toString() ?? "", monthlyMaintenance: sol.monthlyMaintenance?.toString() ?? "" });
  const [ind, setInd] = useState<Record<string, string>>(Object.fromEntries(sol.industries.map((i) => [i.slug, String(i.priority)])));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const label = "mb-1 block text-xs font-medium text-gray-600";

  async function save() {
    setBusy(true);
    const body: Record<string, unknown> = {
      name: f.name, description: f.description, problemsSolved: fromLines(f.problemsSolved), capabilities: fromLines(f.capabilities), deliverables: fromLines(f.deliverables),
      integrations: f.integrations.split(",").map((x) => x.trim()).filter(Boolean), dependencies: fromLines(f.dependencies), defaultComplexity: f.defaultComplexity, active: f.active,
      industries: Object.entries(ind).filter(([, p]) => p !== "").map(([slug, p]) => ({ slug, priority: Number(p) })),
    };
    if (canPrice) Object.assign(body, { basePrice: nullableNum(f.basePrice), pricingMethod: f.pricingMethod, estimatedHours: nullableNum(f.estimatedHours), deliveryWeeks: nullableNum(f.deliveryWeeks), monthlyMaintenance: nullableNum(f.monthlyMaintenance) });
    const r = await call(`/api/ai-automation/admin/solutions/${sol.key}`, "PUT", body);
    setMsg(r.ok ? { ok: true, text: "Saved." } : r); setBusy(false);
    if (r.ok) router.refresh();
  }
  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className={label}>Name</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} /></label>
        <label className="flex items-end gap-2 pb-2"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /><span>Active (offered in assessments)</span></label>
        <label className="sm:col-span-2"><span className={label}>Description</span><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputCls} /></label>
        <label><span className={label}>Business problems solved (one per line)</span><textarea rows={4} value={f.problemsSolved} onChange={(e) => setF({ ...f, problemsSolved: e.target.value })} className={inputCls} /></label>
        <label><span className={label}>Capabilities (one per line)</span><textarea rows={4} value={f.capabilities} onChange={(e) => setF({ ...f, capabilities: e.target.value })} className={inputCls} /></label>
        <label><span className={label}>Deliverables (one per line)</span><textarea rows={4} value={f.deliverables} onChange={(e) => setF({ ...f, deliverables: e.target.value })} className={inputCls} /></label>
        <label><span className={label}>Dependencies (one per line)</span><textarea rows={4} value={f.dependencies} onChange={(e) => setF({ ...f, dependencies: e.target.value })} className={inputCls} /></label>
        <label className="sm:col-span-2"><span className={label}>Required integrations (keys, comma-separated, e.g. whatsapp-business, crm)</span><input value={f.integrations} onChange={(e) => setF({ ...f, integrations: e.target.value })} className={inputCls} /></label>
        <label><span className={label}>Default complexity</span><select value={f.defaultComplexity} onChange={(e) => setF({ ...f, defaultComplexity: e.target.value })} className={inputCls}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></label>
      </div>

      <fieldset className="rounded-lg border border-gray-200 p-4">
        <legend className="px-1 text-xs font-semibold text-gray-700">Commercial terms (USD) {canPrice ? "" : "— you need the pricing permission to edit"}</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <label><span className={label}>Base price</span><input type="number" min={0} step="any" disabled={!canPrice} value={f.basePrice} onChange={(e) => setF({ ...f, basePrice: e.target.value })} placeholder="not priced" className={inputCls} /></label>
          <label><span className={label}>Pricing method</span><select disabled={!canPrice} value={f.pricingMethod} onChange={(e) => setF({ ...f, pricingMethod: e.target.value })} className={inputCls}><option value="FIXED">Fixed</option><option value="PER_UNIT">Per unit</option><option value="HOURLY">Hourly (rate × hours)</option></select></label>
          <label><span className={label}>Estimated development hours</span><input type="number" min={0} disabled={!canPrice} value={f.estimatedHours} onChange={(e) => setF({ ...f, estimatedHours: e.target.value })} className={inputCls} /></label>
          <label><span className={label}>Delivery (weeks)</span><input type="number" min={0} disabled={!canPrice} value={f.deliveryWeeks} onChange={(e) => setF({ ...f, deliveryWeeks: e.target.value })} className={inputCls} /></label>
          <label><span className={label}>Monthly maintenance (0 if none)</span><input type="number" min={0} step="any" disabled={!canPrice} value={f.monthlyMaintenance} onChange={(e) => setF({ ...f, monthlyMaintenance: e.target.value })} placeholder="not set" className={inputCls} /></label>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-gray-200 p-4">
        <legend className="px-1 text-xs font-semibold text-gray-700">Industry compatibility (priority: lower = recommended earlier; blank = not offered)</legend>
        <div className="grid gap-3 sm:grid-cols-3">{allIndustries.map((i) => <label key={i.slug} className="flex items-center gap-2"><input type="number" min={1} max={999} value={ind[i.slug] ?? ""} onChange={(e) => setInd({ ...ind, [i.slug]: e.target.value })} className={`${inputCls} !w-20`} aria-label={`${i.name} priority`} /><span>{i.name}</span></label>)}</div>
        <p className="mt-2 text-xs text-gray-500">Removing a mapping is done by setting the industry inactive or deactivating the solution; blank fields leave existing mappings unchanged.</p>
      </fieldset>
      <div className="flex items-center gap-3"><button className={primaryCls} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save solution"}</button>{msg && <span role="status" className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-red-700 break-all"}>{msg.text}</span>}</div>
    </div>
  );
}
