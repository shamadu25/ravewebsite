import { Section, SectionHeading, Card, IconBox, iconFor } from "@/components/ai-automation/ui";
import PageHero from "@/components/ai-automation/PageHero";
import AssessmentEngine from "@/components/ai-automation/AssessmentEngine";
import Tracker from "@/components/ai-automation/Tracker";
import { Faqs, FinalCta, IndustryGrid, SolutionCards } from "@/components/ai-automation/Sections";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import FAQSchema from "@/components/seo/FAQSchema";
import { getIndustryConfigs, getSolutions } from "@/lib/ai-automation/repo";
import { UNIVERSAL_QUESTIONS, buildQuestionSet } from "@/lib/ai-automation/catalogue";
import { AFTER_ASSESSMENT, AGENT_KEYS, AUTOMATE, BENEFITS, GENERAL_FAQS, HERO, HOW_IT_WORKS, INDUSTRY_BLURBS, USE_CASES } from "@/lib/ai-automation/content/general";
import { GENERAL_PATH, SITE, generalMetadata, serviceJsonLd } from "@/lib/ai-automation/seo";

export const revalidate = 300;
export const metadata = generalMetadata();

export default async function AiAutomationPage() {
  const industries = await getIndustryConfigs();
  const solutions = await getSolutions();
  const agents = AGENT_KEYS.map((k) => solutions.find((s) => s.key === k)).filter((s): s is NonNullable<typeof s> => !!s);
  const options = industries.map((i) => ({ slug: i.slug, name: i.name }));
  const grid = industries.map((i) => ({ slug: i.slug, name: i.name, icon: i.content.icon, blurb: INDUSTRY_BLURBS[i.slug] ?? i.content.hero.subcopy.slice(0, 120), href: i.hasPage ? `/ai-automation/${i.slug}` : `/ai-automation?industry=${i.slug}#assessment` }));
  const schema = serviceJsonLd({ name: "AI automation services for business", description: HERO.subcopy, path: GENERAL_PATH, audience: industries.map((i) => i.name) });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <BreadcrumbSchema items={[{ name: "Home", url: SITE }, { name: "AI Automation", url: `${SITE}${GENERAL_PATH}` }]} />
      <FAQSchema items={GENERAL_FAQS.map((f) => ({ question: f.q, answer: f.a }))} />
      <Tracker />

      <PageHero
        breadcrumbs={[{ name: "Home", href: "/" }, { name: "AI Automation" }]}
        eyebrow="AI business automation by RaveSoft"
        headline={HERO.headline} subcopy={HERO.subcopy} points={HERO.points}
        image={{ src: "/img/business-automation.png", alt: "RaveSoft consultants and business professionals reviewing an AI automation workflow on screen" }}
        primary={HERO.primary} secondary={HERO.secondary} secondaryHref="#solutions" industries={options}
      />

      <Section id="industries" labelledBy="industries-title">
        <SectionHeading id="industries-title" eyebrow="Industries we serve" title="Automation designed around how your industry actually works" intro="Each industry has its own problems, systems and risks. Choose yours to see the agents, workflows and safeguards that fit." />
        <IndustryGrid items={grid} />
      </Section>

      <Section id="what-we-automate" tone="light" labelledBy="automate-title">
        <SectionHeading id="automate-title" eyebrow="What we automate" title="The repetitive work that slows your team down" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AUTOMATE.map((a) => (
            <li key={a.title}><Card className="h-full"><IconBox icon={iconFor(a.icon)} /><h3 className="mt-4 text-base font-bold text-[#071536]">{a.title}</h3><p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">{a.body}</p></Card></li>
          ))}
        </ul>
      </Section>

      <SolutionCards solutions={agents} title="AI agents that work alongside your team" intro="An AI agent is a digital team member with one defined job, a clear set of rules and approved information. It hands over to a person when it should, and everything it does is logged." />

      <Section id="how-it-works" labelledBy="how-title">
        <SectionHeading id="how-title" eyebrow="How the assessment works" title="Six short steps. A proposal built around your answers." />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOW_IT_WORKS.map((s) => (
            <li key={s.n} className="flex gap-4 rounded-lg border border-slate-200 p-5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#060297] text-sm font-bold text-white">{s.n}</span><div><h3 className="font-bold text-[#071536]">{s.title}</h3><p className="mt-1 text-sm text-[#64748B]">{s.body}</p></div></li>
          ))}
        </ol>
        <div className="mt-10 rounded-lg bg-[#F7F9FC] p-6 sm:p-8">
          <h3 className="text-lg font-bold text-[#071536]">What happens after you submit</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">{AFTER_ASSESSMENT.map((t) => <li key={t} className="flex gap-3 text-[15px]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFB200]" aria-hidden="true" />{t}</li>)}</ul>
        </div>
      </Section>

      <Section id="benefits" tone="light" labelledBy="benefits-title">
        <SectionHeading id="benefits-title" eyebrow="Business benefits" title="What well-designed automation can do for a business" intro="We don't promise numbers we can't verify. Benefits are measured against your own baseline once the work is scoped." />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => <li key={b.title}><Card className="h-full"><h3 className="font-bold text-[#071536]">{b.title}</h3><p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">{b.body}</p></Card></li>)}
        </ul>
      </Section>

      <Section id="use-cases" labelledBy="usecases-title">
        <SectionHeading id="usecases-title" eyebrow="Example automation use cases" title="What this looks like in practice" />
        <ul className="grid gap-5 md:grid-cols-2">
          {USE_CASES.map((u) => <li key={u.title}><Card className="h-full"><p className="text-xs font-bold uppercase tracking-wider text-[#060297]">{u.industry}</p><h3 className="mt-2 text-lg font-bold text-[#071536]">{u.title}</h3><p className="mt-2 text-[15px] leading-relaxed text-[#64748B]">{u.body}</p></Card></li>)}
        </ul>
        <p className="mt-6 text-sm text-[#64748B]">These are illustrative examples of what the agents do, not customer results.</p>
      </Section>

      <Section id="assessment" tone="light" labelledBy="assessment-cta-title">
        <div className="mx-auto max-w-3xl">
          <SectionHeading id="assessment-cta-title" eyebrow="Free business assessment" title="Get your personalised AI assessment and proposal" intro="Answer a few questions about your business. We only ask what we need — and you can save your progress and come back." align="center" />
          <AssessmentEngine industries={options} initialQuestions={buildQuestionSet([], UNIVERSAL_QUESTIONS)} />
        </div>
      </Section>

      <Faqs items={GENERAL_FAQS} />
      <FinalCta title="See what AI could take off your team's plate" body="Complete the free assessment and receive a proposal built around your business, your systems and your goals." />
    </>
  );
}
