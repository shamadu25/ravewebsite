import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ArrowRight, Tag, Building2, Zap } from "lucide-react";
import { CASE_STUDIES } from "@/lib/data";
import CTASection from "@/components/ui/CTASection";

type CaseStudySlugParams = { params: Promise<{ slug: string }> };

const TAG_COLORS: Record<string, string> = {
  Product: "bg-purple-50 text-purple-700 border-purple-200",
  Website: "bg-blue-50 text-blue-700 border-blue-200",
  Software: "bg-green-50 text-green-700 border-green-200",
};

export async function generateStaticParams() {
  return CASE_STUDIES.map((cs) => ({ slug: cs.slug }));
}

export async function generateMetadata({ params }: CaseStudySlugParams): Promise<Metadata> {
  const { slug } = await params;
  const cs = CASE_STUDIES.find((c) => c.slug === slug);
  if (!cs) return {};
  return {
    title: `${cs.title} | RaveSoft Case Study`,
    description: `${cs.result} — A RaveSoft case study in the ${cs.industry} sector.`,
  };
}

export default async function CaseStudyPage({ params }: CaseStudySlugParams) {
  const { slug } = await params;
  const cs = CASE_STUDIES.find((c) => c.slug === slug);
  if (!cs) notFound();

  const related = CASE_STUDIES.filter((c) => c.slug !== slug).slice(0, 3);
  const tagColor = TAG_COLORS[cs.tag] ?? "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <>
      {/* HERO */}
      <section className="bg-[#050816] pt-32 pb-16 lg:pt-40">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <Link href="/case-studies" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8">
            ← All Case Studies
          </Link>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${tagColor}`}>
              {cs.tag}
            </span>
            <span className="flex items-center gap-1.5 text-gray-400 text-sm">
              <Building2 className="w-3.5 h-3.5" />
              {cs.industry}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.08] tracking-tighter mb-5">
            {cs.title}
          </h1>
          {/* Impact callout */}
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-[#FFB200]/10 border border-[#FFB200]/30">
            <Zap className="w-4 h-4 text-[#FFB200]" />
            <span className="text-[#FFB200] font-bold text-sm">{cs.impact}</span>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 lg:grid lg:grid-cols-[1fr_320px] lg:gap-16">
          {/* Main content */}
          <div className="space-y-12">
            {/* Problem */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100 mb-4">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">The Challenge</span>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">{cs.problem}</p>
            </div>

            {/* Solution */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 mb-4">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">The Solution</span>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">{cs.solution}</p>
            </div>

            {/* Result */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-100 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-bold text-green-700 uppercase tracking-wider">The Outcome</span>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">{cs.result}</p>
            </div>

            {/* Features delivered */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-5">What Was Built</h2>
              <div className="space-y-3">
                {cs.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-[#F5F7FA] border border-gray-100">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-gray-700 font-medium">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Technologies */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Technologies Used</h2>
              <div className="flex flex-wrap gap-2">
                {cs.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1.5 rounded-lg bg-[#060297]/8 border border-[#060297]/15 text-[#060297] text-sm font-semibold"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="mt-12 lg:mt-0">
            <div className="sticky top-28 space-y-8">
              {/* Project CTA */}
              <div className="p-6 rounded-2xl bg-[#050816] text-white">
                <h3 className="font-bold text-lg mb-2">Want results like this?</h3>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                  Let's talk about what we can build for your business.
                </p>
                <Link
                  href="/contact"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all"
                >
                  Start a Project
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Related case studies */}
              <div>
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4">
                  More Case Studies
                </h3>
                <div className="space-y-4">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/case-studies/${r.slug}`}
                      className="block group"
                    >
                      <span className="text-xs font-semibold text-blue-600 mb-1 block">
                        {r.industry}
                      </span>
                      <span className="text-sm text-gray-700 font-medium group-hover:text-blue-600 transition-colors leading-snug block">
                        {r.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <CTASection
        headline="Let's build something that works for your business"
        subheadline="Every project starts with understanding your goals. Let's have that conversation."
        primaryCTA={{ label: "Start a Project", href: "/contact" }}
        secondaryCTA={{ label: "View All Case Studies", href: "/case-studies" }}
      />
    </>
  );
}
