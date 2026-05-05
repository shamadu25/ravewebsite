import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";
import FAQAccordion from "@/components/ui/FAQAccordion";

export const metadata: Metadata = {
  title: "School Management System | RaveSoft Digital Solutions",
  description:
    "RaveSoft's School Management System covers admissions, fees, attendance, results, parent communication, and staff management for schools and colleges.",
};

const FEATURES = [
  "Student admissions and registration",
  "Class and subject management",
  "Fee collection and receipt generation",
  "Attendance tracking (students and staff)",
  "Examination management and result entry",
  "Report card generation and printing",
  "Parent and guardian communication portal",
  "Staff profiles, roles, and payroll",
  "Library management module",
  "School bus and transport tracking",
  "Notice board and event management",
  "Analytics dashboard for admin",
];

const FAQS = [
  {
    q: "Does the system generate report cards automatically?",
    a: "Yes. After entering exam scores, the system calculates grades and positions based on your grading system, and generates formatted report cards ready to print or share as PDFs.",
  },
  {
    q: "Can parents see their child's results and fees online?",
    a: "Yes. The parent portal allows parents to log in and view their child's attendance, results, fee balances, and school communications from any device.",
  },
  {
    q: "Can I configure the system for different term structures?",
    a: "Yes. The system is fully configurable for different academic calendars — trimesters, semesters, or custom term structures. It also supports different grading scales.",
  },
  {
    q: "Does the system handle multiple schools under one organization?",
    a: "Yes. For school groups and chains, we configure a multi-school admin view that gives you consolidated reporting across all campuses with separate management per school.",
  },
];

export default function SchoolSystemPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative bg-[#050816] pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bg-grid-dark inset-0 opacity-60" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-700/14 rounded-full blur-[130px]" />
        </div>
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <Link href="/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6">
            ← All Products
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/12 border border-blue-500/25 mb-7 mt-4">
            <span className="text-sm text-blue-400 font-semibold">School Management System</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6">
            Run Your School Smarter with{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              Complete Academic Management
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            Our School Management System handles admissions, fees, attendance, results, parent
            communication, and staff management in a single platform — so administrators, teachers,
            and parents all have what they need.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-all shadow-xl shadow-blue-600/30">
              Request a Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/products" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/20 hover:border-white/40 text-white font-semibold text-base transition-all hover:bg-white/5">
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-[#F5F7FA] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="System Capabilities"
            title="Everything a modern school needs in one place"
            className="mb-14"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader eyebrow="FAQs" title="Common questions about our School Management System" className="mb-12" />
          <FAQAccordion items={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      <CTASection
        headline="Ready to modernize how your school operates?"
        subheadline="Book a demo and see how our system simplifies school administration."
        primaryCTA={{ label: "Request a Demo", href: "/contact" }}
        secondaryCTA={{ label: "View All Products", href: "/products" }}
      />
    </>
  );
}
