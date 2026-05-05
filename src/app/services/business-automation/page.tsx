import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";
import FAQAccordion from "@/components/ui/FAQAccordion";

export const metadata: Metadata = {
  title: "Business Automation | RaveSoft Digital Solutions",
  description:
    "Automate your business workflows with custom automation systems built by RaveSoft. Connect your tools, eliminate manual tasks, and run operations at scale.",
};

const FEATURES = [
  "Workflow automation and process digitization",
  "API integrations between disconnected tools",
  "Automated document generation (invoices, reports, contracts)",
  "Email and SMS notification triggers",
  "Scheduled data sync and export pipelines",
  "CRM workflow automation and lead routing",
  "Custom Zapier-style automation flows without monthly SaaS fees",
  "Business intelligence dashboards and auto-reports",
];

const WHO_FOR = [
  "Businesses doing repetitive manual data entry daily",
  "Operations teams using multiple disconnected tools",
  "Sales teams that need automated follow-up and CRM flows",
  "Finance teams generating reports or invoices manually",
  "Companies that want to scale operations without proportionally scaling headcount",
];

const FAQS = [
  {
    q: "What kind of business processes can you automate?",
    a: "We automate data entry, approval workflows, report generation, notifications and alerts, email campaigns, payment reminders, employee onboarding, inventory reorder triggers, customer follow-ups, and much more.",
  },
  {
    q: "Do I need to replace my existing tools?",
    a: "Not necessarily. We build automations that connect your existing tools — your CRM, accounting software, forms, spreadsheets, email, WhatsApp, and others — through integrations and custom logic.",
  },
  {
    q: "How much time can automation save my team?",
    a: "Our clients typically report saving 10–30+ hours per week across their teams after implementing workflow automation. The exact savings depend on your current processes.",
  },
  {
    q: "Is automation only for large businesses?",
    a: "No. Small and medium businesses benefit greatly from automation, especially for sales follow-ups, invoicing, customer communications, and reporting. The cost is often recovered within the first month.",
  },
];

export default function BusinessAutomationPage() {
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
            <span className="text-sm text-blue-400 font-semibold">Business Automation</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6">
            Stop Doing Manually What{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              Machines Should Do For You
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            We identify your most time-consuming repetitive tasks and build automation systems that
            eliminate manual work, reduce human error, and let your team focus on what matters most.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base transition-all" style={{background:"linear-gradient(135deg,#3B82F6,#2563eb)",boxShadow:"0 8px 32px rgba(59,130,246,0.35)"}}>
            Audit My Operations
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
              title="For businesses losing time to work that software should handle"
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
            eyebrow="What We Automate"
            title="From simple notifications to full workflow automation"
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
          <SectionHeader eyebrow="FAQs" title="Common questions about business automation" className="mb-12" />
          <FAQAccordion items={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Ready to eliminate your most painful manual processes?"
        subheadline="We will audit your operations, identify automation opportunities, and build the systems to free your team."
        primaryCTA={{ label: "Start a Project", href: "/contact" }}
        secondaryCTA={{ label: "Book a Free Consultation", href: "/book-consultation" }}
      />
    </>
  );
}
