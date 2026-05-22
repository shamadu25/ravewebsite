import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";
import FAQAccordion from "@/components/ui/FAQAccordion";
import FAQSchema from "@/components/seo/FAQSchema";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "SaaS Development Company in Africa | MVP & SaaS Product Development | RaveSoft",
  description:
    "Build your SaaS product with Africa's leading SaaS development company. RaveSoft builds MVPs, subscription platforms, multi-tenant apps, and admin dashboards for startups and companies across Africa.",
  keywords: [
    "SaaS development company Africa",
    "SaaS development Ghana",
    "MVP development Africa",
    "build SaaS Africa",
    "SaaS product development Ghana",
    "software as a service Ghana",
  ],
};

const FEATURES = [
  "Multi-tenant SaaS architecture",
  "Subscription billing with Stripe or Paystack",
  "User onboarding flows and activation sequences",
  "Admin and analytics dashboards",
  "Role-based access for customers and admins",
  "API-first backend architecture",
  "Cloud-native deployment on AWS, GCP, or Railway",
  "White-labeling and reseller configurations",
];

const WHO_FOR = [
  "Founders building B2B or B2C software products",
  "Businesses that want to productize an internal tool",
  "Agencies that want to turn their service into scalable software",
  "Companies looking to add a recurring revenue stream",
];

const FAQS = [
  {
    q: "What does RaveSoft's SaaS development process look like?",
    a: "We start with product discovery — understanding your users, use cases, pricing model, and competitive landscape. Then we move through wireframing, system architecture design, development sprints, beta testing, and launch.",
  },
  {
    q: "Can you build a SaaS MVP for early validation?",
    a: "Absolutely. We specialize in lean MVPs designed to validate your concept with real users. We help you identify the must-have features for v1 and avoid over-building.",
  },
  {
    q: "Do you handle subscription billing and payment integration?",
    a: "Yes. We integrate Stripe, Paystack, or Flutterwave for subscription billing, plan upgrades, trial management, and automated invoicing.",
  },
  {
    q: "Who owns the SaaS codebase after launch?",
    a: "You do. After final payment, you own all code, designs, and IP. We can continue as your ongoing technical team on a retainer if needed.",
  },
];

export default function SaasDevelopmentPage() {
  return (
    <>
      <FAQSchema items={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://ravesoftsolutions.com" },
        { name: "Services", url: "https://ravesoftsolutions.com/services" },
        { name: "SaaS Product Development", url: "https://ravesoftsolutions.com/services/saas-development" },
      ]} />
      {/* HERO */}
      <section className="relative bg-[#050816] pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bg-grid-dark inset-0 opacity-60" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-700/14 rounded-full blur-[130px]" />
        </div>
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <Link href="/services" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6">
            ← Services
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/12 border border-blue-500/25 mb-7 mt-4">
            <span className="text-sm text-blue-400 font-semibold">SaaS Development</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6">
            Turn Your Idea Into a{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              Scalable SaaS Product
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            We build Software-as-a-Service platforms from concept to launch — architecting the
            multi-tenant infrastructure, billing systems, user onboarding flows, and dashboards
            that make SaaS businesses work.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base transition-all" style={{background:"linear-gradient(135deg,#3B82F6,#2563eb)",boxShadow:"0 8px 32px rgba(59,130,246,0.35)"}}>
            Start Building Your SaaS
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <SectionHeader
              eyebrow="Who This Is For"
              title="Built for founders and businesses ready to build product-led revenue"
              align="left"
            />
            <div className="space-y-3">
              {WHO_FOR.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-[#F5F7FA] border border-gray-100">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <span className="text-gray-700 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-[#F5F7FA] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="What We Build"
            title="Everything a SaaS product needs to launch and grow"
            className="mb-14"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feature, i) => (
              <div key={i} className="flex items-start gap-3 p-5 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <span className="text-gray-700 font-medium text-sm leading-relaxed">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white section-padding">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="FAQs" title="Common questions about SaaS development" className="mb-12" />
          <FAQAccordion items={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Have a SaaS idea you're ready to build?"
        subheadline="We will help you scope it, architect it, and launch it to your first customers."
        primaryCTA={{ label: "Start a Project", href: "/contact" }}
        secondaryCTA={{ label: "Book a Free Consultation", href: "/book-consultation" }}
      />
    </>
  );
}
