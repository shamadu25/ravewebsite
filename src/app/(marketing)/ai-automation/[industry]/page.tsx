import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Card, Section, SectionHeading, iconFor } from "@/components/ai-automation/ui";
import PageHero from "@/components/ai-automation/PageHero";
import AssessmentEngine from "@/components/ai-automation/AssessmentEngine";
import Tracker from "@/components/ai-automation/Tracker";
import { Faqs, FinalCta, SolutionCards } from "@/components/ai-automation/Sections";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import FAQSchema from "@/components/seo/FAQSchema";
import { getIndustryConfig, getIndustryConfigs, getQuestionSet, getSolutions } from "@/lib/ai-automation/repo";
import { PAGE_INDUSTRY_SLUGS, RESERVED_SLUGS } from "@/lib/ai-automation/catalogue";
import { GENERAL_PATH, SITE, industryMetadata, industryPath, serviceJsonLd } from "@/lib/ai-automation/seo";

export const revalidate = 300;
export const dynamicParams = true; // administrators can publish new industries without a deploy

type Params = { params: Promise<{ industry: string }> };

export function generateStaticParams() {
  return PAGE_INDUSTRY_SLUGS.map((industry) => ({ industry }));
}

async function load(slug: string) {
  if (RESERVED_SLUGS.includes(slug)) return null;
  const i = await getIndustryConfig(slug);
  return i && i.hasPage && i.active ? i : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const i = await load((await params).industry);
  return i ? industryMetadata(i) : { title: "Not found", robots: { index: false } };
}

export default async function IndustryPage({ params }: Params) {
  const { industry: slug } = await params;
  const i = await load(slug);
  if (!i) notFound();
  const c = i.content;
  const all = await getIndustryConfigs();
  const options = all.map((x) => ({ slug: x.slug, name: x.name }));
  const solutions = (await getSolutions())
    .filter((s) => s.mappings.some((m) => m.industrySlug === slug))
    .sort((a, b) => (a.mappings.find((m) => m.industrySlug === slug)?.priority ?? 999) - (b.mappings.find((m) => m.industrySlug === slug)?.priority ?? 999));
  const questions = await getQuestionSet(slug);
  const others = all.filter((x) => x.hasPage && x.slug !== slug);
  const Icon = iconFor(c.icon);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd({ name: `AI automation for ${i.name}`, description: i.seo.description, path: industryPath(slug), audience: c.audience })) }} />
      <BreadcrumbSchema items={[{ name: "Home", url: SITE }, { name: "AI Automation", url: `${SITE}${GENERAL_PATH}` }, { name: i.name, url: `${SITE}${industryPath(slug)}` }]} />
      {c.faqs.length > 0 && <FAQSchema items={c.faqs.map((f) => ({ question: f.q, answer: f.a }))} />}
      <Tracker industry={slug} />

      <PageHero
        breadcrumbs={[{ name: "Home", href: "/" }, { name: "AI Automation", href: GENERAL_PATH }, { name: i.name }]}
        eyebrow={c.hero.eyebrow} headline={c.hero.headline} subcopy={c.hero.subcopy} points={c.hero.bullets}
        image={c.hero.image} primary={c.cta.primary} secondary={c.cta.secondary} secondaryHref="#solutions" industries={options} industry={{ slug, name: i.name }}
      />

      <Section id="who" labelledBy="who-title">
        <SectionHeading id="who-title" eyebrow={`Built for ${c.shortName.toLowerCase()}`} title="Who this is for" />
        <ul className="flex flex-wrap gap-2.5">{c.audience.map((a) => <li key={a} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F7F9FC] px-4 py-2 text-sm font-semibold text-[#071536]"><Icon className="h-4 w-4 text-[#060297]" aria-hidden="true" />{a}</li>)}</ul>
      </Section>

      <Section id="problems" tone="light" labelledBy="problems-title">
        <SectionHeading id="problems-title" eyebrow="Business problems" title={`Where ${c.shortName.toLowerCase()} businesses lose time and revenue`} />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {c.problems.map((p) => <li key={p.title}><Card className="h-full"><h3 className="font-bold text-[#071536]">{p.title}</h3><p className="mt-2 text-[15px] leading-relaxed text-[#64748B]">{p.body}</p></Card></li>)}
        </ul>
      </Section>

      <SolutionCards solutions={solutions} title={`AI solutions recommended for ${i.name.toLowerCase()}`} intro="The assessment matches these to your answers, so you only see what is relevant to your business." />

      <Section id="use-cases" labelledBy="usecases-title">
        <SectionHeading id="usecases-title" eyebrow="Relevant use cases" title="How the agents work day to day" />
        <ul className="grid gap-5 lg:grid-cols-3">
          {c.useCases.map((u) => (
            <li key={u.title}><Card className="h-full"><h3 className="text-lg font-bold text-[#071536]">{u.title}</h3><p className="mt-2 text-[15px] text-[#64748B]">{u.scenario}</p>
              <ol className="mt-4 space-y-2.5">{u.steps.map((s, n) => <li key={s} className="flex gap-3 text-sm text-[#172033]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#060297] text-[11px] font-bold text-white">{n + 1}</span><span>{s}</span></li>)}</ol></Card></li>
          ))}
        </ul>
      </Section>

      {c.safeguards && (
        <Section id="safeguards" tone="navy" labelledBy="safeguards-title">
          <div className="flex max-w-3xl gap-4"><ShieldCheck className="mt-1 h-7 w-7 shrink-0 text-[#FFB200]" aria-hidden="true" /><div><h2 id="safeguards-title" className="text-2xl font-bold">{c.safeguards.title}</h2><p className="mt-3 text-base leading-relaxed text-slate-300">{c.safeguards.body}</p></div></div>
        </Section>
      )}

      <Section id="integrations" tone={c.safeguards ? "white" : "light"} labelledBy="integrations-title">
        <SectionHeading id="integrations-title" eyebrow="Relevant integrations" title="Connects to the systems you already use" intro="Integration depends on each system offering an API or data export. We confirm what is possible for your systems before you commit." />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{c.integrations.map((x) => <li key={x} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#172033]">{x}</li>)}</ul>
      </Section>

      <Section id="assessment" tone="light" labelledBy="assessment-cta-title">
        <div className="mx-auto max-w-3xl">
          <SectionHeading id="assessment-cta-title" eyebrow="Free business assessment" title={c.cta.closing} intro={c.assessmentIntro} align="center" />
          <AssessmentEngine industries={options} initialIndustry={slug} initialQuestions={questions} heading={`Free ${i.name} AI Assessment`} />
        </div>
      </Section>

      <Faqs items={c.faqs} />

      <Section id="related" tone="light" labelledBy="related-title">
        <SectionHeading id="related-title" eyebrow="Explore more" title="Related RaveSoft solutions" />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {c.related.map((r) => <li key={r.href}><Link href={r.href} className="flex h-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-[#071536] hover:border-[#060297]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#060297]">{r.label}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link></li>)}
        </ul>
        <p className="mt-8 text-sm font-semibold text-[#64748B]">Other industries:</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          <li><Link href={GENERAL_PATH} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-[#060297] hover:bg-white">All AI automation</Link></li>
          {others.map((o) => <li key={o.slug}><Link href={industryPath(o.slug)} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-[#060297] hover:bg-white">{o.name}</Link></li>)}
        </ul>
      </Section>

      <FinalCta title={c.cta.closing} body="Complete the free assessment and receive a proposal built around your business, your systems and your goals." primary={c.cta.primary} />
    </>
  );
}
