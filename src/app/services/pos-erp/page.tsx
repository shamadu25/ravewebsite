import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";
import FAQAccordion from "@/components/ui/FAQAccordion";

export const metadata: Metadata = {
  title: "POS & ERP Systems | RaveSoft Digital Solutions",
  description:
    "RaveSoft builds custom POS (Point of Sale) and ERP (Enterprise Resource Planning) systems for retail, hospitality, manufacturing, and service businesses in Ghana and Africa.",
};

const FEATURES = [
  "Point of Sale (POS) with multi-terminal support",
  "Inventory and stock management with low-stock alerts",
  "Customer management and loyalty programs",
  "Supplier and purchase order management",
  "Multi-branch and location management",
  "Employee attendance and payroll modules",
  "Financial reports, profit/loss, and cash flow",
  "Integration with payment terminals and printers",
  "Offline mode with automatic sync",
  "Mobile POS for field sales and delivery",
];

const WHO_FOR = [
  "Retail stores, supermarkets, and pharmacies",
  "Restaurants, cafés, hotels, and hospitality businesses",
  "Distributors and wholesale businesses",
  "Manufacturing companies needing production tracking",
  "Multi-branch businesses needing central visibility",
];

const FAQS = [
  {
    q: "Is CliqPOS a custom build or an existing product?",
    a: "CliqPOS is an existing RaveSoft product that we actively develop and deploy. It can be used as-is or customized for your specific business operations. We also build fully custom ERP systems for complex enterprise needs.",
  },
  {
    q: "Does the system work offline?",
    a: "Yes. Our POS systems are built with offline capability — your team can continue selling even without internet, and all data syncs automatically when connectivity is restored.",
  },
  {
    q: "Can I manage multiple branches from one dashboard?",
    a: "Yes. Our multi-branch module lets you manage all locations, view consolidated reports, transfer stock between branches, and control access per branch from a central admin dashboard.",
  },
  {
    q: "Can the ERP be integrated with our existing accounting software?",
    a: "Yes. We integrate with QuickBooks, Sage, Xero, and custom accounting platforms through API connections or data export modules.",
  },
];

export default function PosErpPage() {
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
            <span className="text-sm text-blue-400 font-semibold">POS & ERP Systems</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6">
            POS and ERP Systems Built for{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              African Business Operations
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            We build and deploy POS and ERP systems that give businesses complete control over
            sales, inventory, staff, suppliers, and finances — in a single, unified platform built
            for how you actually operate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base transition-all" style={{background:"linear-gradient(135deg,#3B82F6,#2563eb)",boxShadow:"0 8px 32px rgba(59,130,246,0.35)"}}>
              Get a Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/products" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/20 hover:border-white/40 text-white font-semibold text-base transition-all hover:bg-white/5">
              View CliqPOS Product
            </Link>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <SectionHeader
              eyebrow="Who This Is For"
              title="For businesses that need full operational visibility and control"
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
            eyebrow="System Capabilities"
            title="Everything you need to run and monitor your business"
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="FAQs" title="Common questions about POS and ERP systems" className="mb-12" />
          <FAQAccordion items={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Ready to get full control over your business operations?"
        subheadline="Let's discuss your operations and configure the right system for your business."
        primaryCTA={{ label: "Request a Demo", href: "/contact" }}
        secondaryCTA={{ label: "View CliqPOS Product", href: "/products" }}
      />
    </>
  );
}
