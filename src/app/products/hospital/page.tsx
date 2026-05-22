import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";
import FAQAccordion from "@/components/ui/FAQAccordion";
import SoftwareAppSchema from "@/components/seo/SoftwareAppSchema";

export const metadata: Metadata = {
  title: "Hospital Management System Ghana | Healthcare Software for Hospitals & Clinics",
  description:
    "Best hospital management system in Ghana. Patient records, billing, appointments, pharmacy, lab management, and staff profiles for hospitals, clinics, and medical centres across Africa.",
  keywords: [
    "hospital management system Ghana",
    "hospital management software Ghana",
    "clinic management software Ghana",
    "healthcare software Ghana",
    "patient management system Ghana",
    "hospital software Africa",
  ],
};

const FEATURES = [
  "Patient registration and medical records",
  "Appointment scheduling and doctor calendar",
  "Outpatient and inpatient management",
  "Billing, invoicing, and payment tracking",
  "Pharmacy dispensing and stock management",
  "Laboratory requests and results management",
  "Radiology and imaging records",
  "Ward and bed management",
  "Staff profiles, schedules, and payroll",
  "Financial reports and revenue analytics",
  "Insurance and NHIS billing support",
  "Patient communication and reminders",
];

const FAQS = [
  {
    q: "Can the system be customized for a private clinic vs a full hospital?",
    a: "Yes. We configure the system to match your size and type. A small clinic needs fewer modules (outpatient, billing, pharmacy) while a full hospital requires inpatient, ward management, lab, radiology, and more.",
  },
  {
    q: "Does the system support insurance and NHIS billing?",
    a: "Yes. The billing module supports cash, insurance, and NHIS claims processing with the ability to configure tariffs, deductibles, and coverage limits per scheme.",
  },
  {
    q: "Is patient data stored securely?",
    a: "Yes. Patient data is encrypted at rest and in transit. Role-based access ensures only authorized staff can view specific patient information. We comply with data privacy best practices.",
  },
  {
    q: "Can doctors and staff access the system on mobile?",
    a: "Yes. The system includes a mobile-responsive interface and optionally a dedicated mobile app for doctors to view patient notes, lab results, and schedules from any device.",
  },
];

export default function HospitalSystemPage() {
  return (
    <>
      <SoftwareAppSchema
        name="Hospital Management System"
        description="Hospital management software covering patient records, appointments, billing, pharmacy, lab management, and staff operations for hospitals and clinics in Nigeria and Ghana."
        applicationCategory="MedicalApplication"
        url="https://ravesoftsolutions.com/products/hospital"
        features={FEATURES}
        offers={{ priceDescription: "Contact for pricing" }}
      />
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
            <span className="text-sm text-blue-400 font-semibold">Hospital Management System</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6">
            End-to-End Healthcare Operations,{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              Digitized and Connected
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            Our Hospital Management System gives hospitals, clinics, and medical centres complete
            operational control — from patient registration to billing, pharmacy, lab, and
            financial reporting in one connected platform.
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

      {/* PRODUCT SCREENSHOT */}
      <section className="bg-white pt-4 pb-0">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="relative rounded-2xl overflow-hidden border border-gray-200/80 shadow-2xl shadow-gray-300/40">
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-3 bg-white rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-400 font-mono">
                hospital.ravesoftsolutions.com
              </div>
            </div>
            <Image
              src="/img/hospital-management-system.png"
              alt="Hospital Management System dashboard showing patient records, appointments, billing, and pharmacy management"
              width={1280}
              height={720}
              className="w-full h-auto"
              priority
            />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-[#F5F7FA] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="System Capabilities"
            title="A complete digital infrastructure for healthcare operations"
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
          <SectionHeader eyebrow="FAQs" title="Common questions about our Hospital Management System" className="mb-12" />
          <FAQAccordion items={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      <CTASection
        headline="Ready to digitize your hospital or clinic?"
        subheadline="Book a demo and see how our system transforms healthcare operations."
        primaryCTA={{ label: "Request a Demo", href: "/contact" }}
        secondaryCTA={{ label: "View All Products", href: "/products" }}
      />
    </>
  );
}
