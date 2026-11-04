import type { Metadata } from "next";
import { ArrowRight, Layers, Lightbulb, MapPin, ShieldCheck, ShoppingCart } from "lucide-react";
import FAQSchema from "@/components/seo/FAQSchema";
import FormCta from "@/components/get-started/FormCta";
import LeadForm from "@/components/get-started/LeadForm";
import LandingTracker from "@/components/get-started/LandingTracker";
import StickyCta from "@/components/get-started/StickyCta";
import { Challenges, Faq, FinalCta, HowItWorks, LANDING_FAQS, Offerings, SolutionSelector, WhyRaveSoft } from "@/components/get-started/Sections";
import { COMPANY } from "@/lib/data";
import { resolveSolution } from "@/lib/getStarted";

const TITLE = "Free Business Consultation: Business Software, Custom Development & AI Automation";
const DESCRIPTION =
  "Tell RaveSoft what your business needs. From POS, ERP and industry-specific systems to custom software, websites, mobile apps and AI automation, get a free, no-obligation consultation on the right technology solution.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Canonical ignores ad parameters (?solution=, utm_*, fbclid) so every campaign URL consolidates to one page.
  alternates: { canonical: "/get-started" },
  // openGraph replaces the layout's wholesale in Next.js, so it is declared in full here (same /api/og asset as the rest of the site).
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ravesoftsolutions.com/get-started",
    siteName: "RaveSoft Digital Solutions",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "RaveSoft Digital Solutions" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/api/og"] },
  robots: { index: true, follow: true },
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function GetStartedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Untrusted ad parameter → a known solution or nothing (unknown values are ignored safely).
  const selected = resolveSolution(first((await searchParams).solution));

  return (
    <>
      <FAQSchema items={LANDING_FAQS} />
      <LandingTracker solution={selected?.value} />

      {/* ── SECTION 1 + 2: HERO and LEAD FORM ─────────────────────────────────────────────── */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden bg-[#070B19] pb-12 pt-24 text-white sm:pt-28 lg:pb-20 lg:pt-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 50% at 15% 0%, rgba(57,123,255,0.22), transparent 70%), radial-gradient(45% 45% at 100% 20%, rgba(6,2,151,0.55), transparent 70%)" }} />
        <div className="relative mx-auto grid w-full max-w-[1200px] gap-8 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-x-14">
          {/* Headline, copy and CTA (first on mobile) */}
          <div className="lg:row-span-1">
            <p className="text-xs font-bold tracking-[0.2em] text-[#FFB200] sm:text-sm">SOFTWARE. INTELLIGENCE. AUTOMATION.</p>
            <h1 id="hero-title" className="mt-4 text-[2rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              TECHNOLOGY THAT MOVES YOUR BUSINESS FORWARD.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">
              From business management software and industry-specific systems to custom applications and AI-powered automation, RaveSoft helps businesses streamline operations, improve productivity and grow with the right technology.
            </p>

            {selected && (
              <p className="mt-5 max-w-xl rounded-xl border border-[#397BFF]/40 bg-[#397BFF]/10 px-4 py-3 text-sm text-blue-50" data-testid="selected-interest">
                <span className="font-semibold text-white">You&apos;re enquiring about: {selected.label}.</span> {selected.blurb}
              </p>
            )}

            <div className="mt-7">
              <FormCta
                location="hero"
                solution={selected?.value}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#FFB200] px-6 text-base font-extrabold tracking-wide text-[#070B19] shadow-[0_8px_24px_rgba(255,178,0,0.35)] transition hover:bg-[#ffc233] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#070B19] sm:w-auto sm:px-8"
              >
                GET A FREE BUSINESS CONSULTATION <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </FormCta>
              <p className="mt-3 max-w-md text-sm text-gray-400">Tell us what your business needs. Our team will help you identify the right technology solution.</p>
            </div>
          </div>

          {/* The one lead form (second on mobile, right column on desktop) */}
          <div className="lg:row-span-2 lg:row-start-1 lg:col-start-2">
            <LeadForm initialSolution={selected?.value} />
          </div>

          {/* Benefits and verified trust points (after the form on mobile) */}
          <div className="lg:col-start-1 lg:row-start-2">
            <ul className="grid gap-3 text-sm text-gray-200 sm:grid-cols-1">
              <li className="flex items-start gap-3"><Layers className="mt-0.5 h-5 w-5 shrink-0 text-[#FFB200]" aria-hidden="true" /> Business software, custom development and AI automation from one provider</li>
              <li className="flex items-start gap-3"><Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#FFB200]" aria-hidden="true" /> Consultation-led: we recommend what fits your business</li>
              <li className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#FFB200]" aria-hidden="true" /> Free, no-obligation consultation</li>
            </ul>
            <ul className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-gray-400 sm:flex-row sm:flex-wrap sm:gap-x-6">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#397BFF]" aria-hidden="true" /> {COMPANY.name}, {COMPANY.location}</li>
              <li className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-[#397BFF]" aria-hidden="true" /> CliqPOS cloud POS is used by businesses in Ghana and Nigeria</li>
            </ul>
          </div>
        </div>
      </section>

      <SolutionSelector />
      <Challenges />
      <Offerings />
      <HowItWorks />
      <WhyRaveSoft />
      <Faq />
      <FinalCta />
      <StickyCta />
    </>
  );
}
