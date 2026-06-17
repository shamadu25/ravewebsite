import type { Metadata } from "next";
import SectionHeader from "@/components/ui/SectionHeader";
import CaseStudyCard from "@/components/ui/CaseStudyCard";
import CTASection from "@/components/ui/CTASection";
import { CASE_STUDIES } from "@/lib/data";

export const metadata: Metadata = {
  title: "Software Case Studies Ghana | Real Results for African Businesses | RaveSoft",
  description:
    "See how RaveSoft has helped businesses across Ghana and Africa with custom software, POS systems, ERP, hospital management, and website development — real projects, real results.",
  keywords: [
    "software case studies Ghana",
    "RaveSoft projects",
    "software company results Ghana",
    "custom software success stories Africa",
  ],
};

export default function CaseStudiesPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative bg-[#050816] pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bg-grid-dark inset-0 opacity-60" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-700/14 rounded-full blur-[130px]" />
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[280px] h-[280px] bg-green-600/5 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/12 border border-blue-500/25 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-sm text-blue-400 font-semibold">Case Studies</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6 max-w-4xl mx-auto">
            Real Businesses.{" "}
            <span style={{background:"linear-gradient(135deg,#34D399,#60A5FA)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              Real Results.
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto">
            Every project we take on is focused on delivering measurable outcomes for the
            business — reduced costs, faster operations, more revenue, better customer
            experience. Here are some of the challenges we have solved.
          </p>
        </div>
      </section>

      {/* CASE STUDIES GRID */}
      <section className="bg-[#F8FAFB] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="All Case Studies"
            title="Proof that our systems solve real business problems"
            className="mb-14"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CASE_STUDIES.map((cs, i) => (
              <CaseStudyCard
                key={cs.id}
                title={cs.title}
                industry={cs.industry}
                tag={cs.tag}
                problem={cs.problem}
                result={cs.result}
                impact={cs.impact}
                href={`/case-studies/${cs.slug}`}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Want results like these for your business?"
        subheadline="Tell us about your challenge and we will show you how we can help."
        primaryCTA={{ label: "Start a Project", href: "/contact" }}
        secondaryCTA={{ label: "View Services", href: "/services" }}
      />
    </>
  );
}
