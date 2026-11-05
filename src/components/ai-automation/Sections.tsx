import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Card, CtaLink, IconBox, Section, SectionHeading, iconFor } from "./ui";
import FAQAccordion from "@/components/ui/FAQAccordion";
import { INTEGRATION_LABELS, type SolutionRecord } from "@/lib/ai-automation/types";

export function SolutionCards({ solutions, id = "solutions", title, intro, eyebrow = "AI agents & workforce solutions" }: { solutions: SolutionRecord[]; id?: string; title: string; intro?: string; eyebrow?: string }) {
  return (
    <Section id={id} tone="light" labelledBy={`${id}-title`}>
      <SectionHeading id={`${id}-title`} eyebrow={eyebrow} title={title} intro={intro} />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {solutions.map((s) => (
          <li key={s.key}>
            <Card className="flex h-full flex-col">
              <h3 className="text-lg font-bold text-[#071536]">{s.name}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#64748B]">{s.description}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-[#172033]">
                {s.capabilities.slice(0, 3).map((c) => <li key={c} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#060297]" aria-hidden="true" /><span>{c}</span></li>)}
              </ul>
              {s.integrations.length > 0 && <p className="mt-auto pt-4 text-xs text-[#64748B]">Connects to: {s.integrations.slice(0, 3).map((i) => INTEGRATION_LABELS[i] ?? i).join(", ")}{s.integrations.length > 3 ? "…" : ""}</p>}
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Faqs({ items, title = "Frequently asked questions" }: { items: Array<{ q: string; a: string }>; title?: string }) {
  return (
    <Section id="faq" labelledBy="faq-title">
      <div className="mx-auto max-w-3xl">
        <SectionHeading id="faq-title" eyebrow="FAQ" title={title} />
        <FAQAccordion items={items.map((f) => ({ question: f.q, answer: f.a }))} />
      </div>
    </Section>
  );
}

export function FinalCta({ title, body, primary = "Get My Free AI Business Assessment" }: { title: string; body: string; primary?: string }) {
  return (
    <Section tone="navy" labelledBy="final-cta-title">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="final-cta-title" className="text-[1.75rem] font-bold leading-tight sm:text-3xl lg:text-4xl">{title}</h2>
        <p className="mt-4 text-base text-slate-300 sm:text-lg">{body}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <CtaLink href="#assessment">{primary}</CtaLink>
          <CtaLink href="/contact" variant="secondary" onDark>Talk to our team</CtaLink>
        </div>
        <p className="mt-4 text-sm text-slate-400">Free. No account needed. Every proposal is reviewed by our team before it reaches you.</p>
      </div>
    </Section>
  );
}

export function IndustryGrid({ items }: { items: Array<{ slug: string; name: string; icon: string; blurb: string; href: string }> }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => {
        const Icon = iconFor(i.icon);
        return (
          <li key={i.slug}>
            <Link href={i.href} className="group flex h-full gap-4 rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-[#060297]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#060297]">
              <IconBox icon={Icon} />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-base font-bold text-[#071536]">{i.name}<ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" /></span>
                <span className="mt-1 block text-sm leading-relaxed text-[#64748B]">{i.blurb}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
