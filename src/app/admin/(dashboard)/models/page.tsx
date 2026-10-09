import { configuredProviders, modelNameFor, providerOrder, type ModelTier } from "@/lib/os/llm";
import ModelLab from "@/components/os/ModelLab";
import { Card, PageHeader } from "@/components/os/ui";

export const dynamic = "force-dynamic";
const TIERS: ModelTier[] = ["fast", "standard", "strong"];
const ENV: Record<string, string> = { openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY", google: "GEMINI_API_KEY" };

export default function ModelsPage() {
  const on = configuredProviders();
  return (
    <div className="space-y-8">
      <PageHeader title="Model lab" subtitle="Which AI models the workforce uses, what they cost, and how they compare on RaveSoft's own tasks." />
      <Card>
        <h2 className="mb-3 text-[15px] font-semibold">Providers</h2>
        <ul className="space-y-1.5 text-[14px]">
          {Object.entries(ENV).map(([name, env]) => <li key={name} className="flex justify-between gap-3"><span className="font-medium capitalize">{name === "google" ? "Google Gemini" : name}</span><span className={on.includes(name as never) ? "text-emerald-700" : "text-[var(--muted)]"}>{on.includes(name as never) ? "Connected" : `NOT CONNECTED — set ${env}`}</span></li>)}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-1 text-[15px] font-semibold">Routing</h2>
        <p className="mb-3 text-[13px] text-[var(--muted)]">Each task asks for a tier; the first connected provider in this order answers, and the next one takes over if it fails. Change the order with <code>OS_PROVIDER_FAST</code>, <code>OS_PROVIDER_STANDARD</code> or <code>OS_PROVIDER_STRONG</code> (values: <code>openai</code>, <code>google</code>, <code>anthropic</code>).</p>
        <table className="w-full text-[13px]"><tbody>{TIERS.map((t) => <tr key={t} className="border-t border-[var(--border)]"><td className="py-2 font-medium capitalize">{t}</td><td className="py-2">{providerOrder(t).map((p) => `${p.name} (${p.modelFor(t)})`).join(" → ") || "—"}</td></tr>)}</tbody></table>
        {on.length > 0 && <p className="mt-2 text-[12px] text-[var(--muted)]">Model names: {on.map((p) => `${p}: ${TIERS.map((t) => modelNameFor(p, t)).join(" / ")}`).join(" · ")}. Override with <code>OS_GEMINI_MODEL_FAST/STANDARD/STRONG</code> (and the OpenAI/Anthropic equivalents) if a newer model is available.</p>}
      </Card>
      <ModelLab configured={on.length > 0} />
    </div>
  );
}
