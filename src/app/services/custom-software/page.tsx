import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";
import FAQAccordion from "@/components/ui/FAQAccordion";

export const metadata: Metadata = {
  title: "Custom Software Development | RaveSoft Digital Solutions",
  description:
    "RaveSoft builds custom software systems tailored to your exact business operations. From workflow tools to enterprise platforms — we build it your way.",
};

const FEATURES = [
  "Business workflow automation and digitization",
  "Admin dashboards and reporting systems",
  "Multi-user role-based access systems",
  "Database design and data management systems",
  "API development and third-party integrations",
  "Cloud-hosted and on-premise deployment",
  "Ongoing support, maintenance, and iteration",
];

const WHO_FOR = [
  "Businesses with manual processes that need automation",
  "Companies with workflows that no off-the-shelf software supports",
  "Organizations that need data visibility across departments",
  "Businesses that have outgrown generic tools like Excel or Google Sheets",
  "Enterprises that need custom modules added to existing systems",
];

const FAQS = [
  {
    q: "What type of custom software can RaveSoft build?",
    a: "We build internal tools, admin systems, workflow automation platforms, reporting dashboards, inventory management systems, CRM systems, and any business-specific application your operations require.",
  },
  {
    q: "How long does a custom software project take?",
    a: "Timelines vary by complexity. Simple internal tools can be ready in 4–6 weeks. Medium-complexity systems typically take 8–14 weeks. Larger enterprise platforms are scoped individually.",
  },
  {
    q: "Do you provide source code ownership?",
    a: "Yes. After final payment, you receive full ownership of the source code. We can also maintain and host the application on your behalf under a monthly support plan.",
  },
  {
    q: "Can you integrate the custom software with our existing tools?",
    a: "Yes. We build integrations with payment gateways, accounting tools, ERP systems, HR platforms, communication tools, and any service with an available API.",
  },
];

export default function CustomSoftwarePage() {
  return (
    <>
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
            <span className="text-sm text-blue-400 font-semibold">Custom Software Development</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6">
            Software Built Exactly for{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              How Your Business Works
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            We design and build custom software systems that replace manual workflows, connect your
            operations, and give your team and leadership complete visibility into your business.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base transition-all" style={{background:"linear-gradient(135deg,#3B82F6,#2563eb)",boxShadow:"0 8px 32px rgba(59,130,246,0.35)"}}>
            Discuss Your Project
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <SectionHeader
                eyebrow="Who This Is For"
                title="Custom software is the right choice when off-the-shelf tools aren't enough"
                align="left"
              />
              <div className="space-y-3 mt-8">
                {WHO_FOR.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-[#F5F7FA] border border-gray-100">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-gray-700 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Custom software visual */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-200/60 border border-gray-100">
              <Image
                src="/img/custom-software-development.png"
                alt="RaveSoft engineers building custom software solutions for African businesses"
                width={700}
                height={500}
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white font-semibold text-sm">Built for Your Exact Workflow</p>
                <p className="text-gray-300 text-xs mt-0.5">No templates · No compromises · Built from scratch</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-[#F5F7FA] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="What We Build"
            title="End-to-end custom software capabilities"
            className="mb-14"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <div key={i} className="flex items-start gap-3 p-5 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-700 font-medium text-sm leading-relaxed">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white section-padding">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="FAQs"
            title="Common questions about custom software development"
            className="mb-12"
          />
          <FAQAccordion items={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Ready to replace your manual processes with a system that works?"
        subheadline="Tell us about your workflow challenges and we will design a solution built specifically for your business."
        primaryCTA={{ label: "Start a Project", href: "/contact" }}
        secondaryCTA={{ label: "Book a Free Consultation", href: "/book-consultation" }}
      />
    </>
  );
}
