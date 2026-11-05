import { CheckCircle2, Lightbulb, HelpCircle, Gauge } from "lucide-react";

/** Illustrative preview of the analysis structure. Contains NO metrics or customer data — it shows how facts, inferences and gaps are labelled. */
export default function AnalysisPreview({ industry = "your business" }: { industry?: string }) {
  const rows = [
    { icon: CheckCircle2, tag: "You told us", cls: "bg-emerald-50 text-emerald-800", text: "Enquiries arrive by WhatsApp and phone; replies depend on who is free." },
    { icon: Lightbulb, tag: "Our inference", cls: "bg-blue-50 text-blue-800", text: "A shared first-response step would remove most of the waiting." },
    { icon: Gauge, tag: "Expected outcome", cls: "bg-amber-50 text-amber-900", text: "More consistent response — sized once your baseline is measured." },
    { icon: HelpCircle, tag: "We still need", cls: "bg-slate-100 text-slate-700", text: "Current enquiry volume and which CRM you use." },
  ];
  return (
    <div className="rounded-lg border border-white/15 bg-white/[0.06] p-4 backdrop-blur-sm" role="img" aria-label={`Illustrative example of an AI analysis for ${industry}: facts, inferences, expected outcomes and open questions are labelled separately.`}>
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-300"><span>AI analysis — structure</span><span className="rounded bg-white/10 px-2 py-0.5">Illustrative example</span></div>
      <ul className="mt-3 space-y-2" aria-hidden="true">
        {rows.map((r) => (
          <li key={r.tag} className="flex items-start gap-2.5 rounded-md bg-white p-2.5">
            <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#060297]" />
            <div className="min-w-0"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${r.cls}`}>{r.tag}</span><p className="mt-1 text-xs leading-snug text-[#172033]">{r.text}</p></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
