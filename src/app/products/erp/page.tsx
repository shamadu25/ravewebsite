import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";
import FAQAccordion from "@/components/ui/FAQAccordion";
import SoftwareAppSchema from "@/components/seo/SoftwareAppSchema";

export const metadata: Metadata = {
  title: "ERP System Ghana | Business Management Software for African Companies | RaveSoft",
  description:
    "Best ERP system in Ghana. Complete business management software covering sales, inventory, HR, accounting, procurement, and reporting for SMEs and enterprises across Africa.",
  keywords: [
    "ERP system Ghana",
    "ERP software Ghana",
    "ERP for African businesses",
    "business management software Ghana",
    "enterprise resource planning Ghana",
    "inventory management system Ghana",
  ],
};

const FEATURES = [
  "Sales and order management",
  "Inventory and stock control",
  "Procurement and purchase orders",
  "Accounts payable and receivable",
  "HR and staff management",
  "Financial reporting and P&L",
  "Customer and supplier database",
  "Multi-department access with roles",
  "Manufacturing and production tracking",
  "Custom reports and analytics dashboard",
];

const MODULES = [
  { num: "01", title: "Sales", desc: "Quotations, orders, invoicing, and customer management" },
  { num: "02", title: "Inventory", desc: "Stock levels, movements, alerts, and warehouse management" },
  { num: "03", title: "Procurement", desc: "Supplier orders, goods receipt, and purchase management" },
  { num: "04", title: "Finance", desc: "Accounts, payments, bank reconciliation, and reporting" },
  { num: "05", title: "HR", desc: "Employee records, attendance, payroll, and leave management" },
  { num: "06", title: "Reports", desc: "Custom dashboards, P&L, balance sheet, and data exports" },
];

const FAQS = [
  {
    q: "Is this a pre-built ERP or a custom-built system?",
    a: "It can be either. We have a base ERP system that covers most business operations, which we configure and extend for your specific needs. For complex or unique workflows, we build fully custom modules.",
  },
  {
    q: "Can the ERP be integrated with our existing accounting software?",
    a: "Yes. We integrate with QuickBooks, Sage, Xero, Wave, and custom accounting systems through API connections or data export pipelines.",
  },
  {
    q: "How long does an ERP implementation take?",
    a: "Configuration-based deployments typically take 4–8 weeks. Custom-built ERPs with unique modules are scoped individually, typically 10–20 weeks depending on complexity.",
  },
  {
    q: "Can staff use different modules with different permissions?",
    a: "Yes. Our ERP has a full role-based access control system. Each user only sees and interacts with the modules and data relevant to their role.",
  },
];

export default function ERPSystemPage() {
  return (
    <>
      <SoftwareAppSchema
        name="ERP System"
        description="Enterprise Resource Planning software for businesses needing sales, inventory, HR, accounting, procurement, and multi-department management in one unified platform across Africa."
        applicationCategory="BusinessApplication"
        url="https://ravesoftsolutions.com/products/erp"
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
            <span className="text-sm text-blue-400 font-semibold">ERP System</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6">
            One System for Your Entire{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              Business Operations
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            Our ERP platform gives growing businesses complete control over sales, inventory,
            procurement, finance, HR, and reporting — connected in a single system designed
            for how African businesses actually operate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-all shadow-xl shadow-blue-600/30">
              Request a Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/services/pos-erp" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/20 hover:border-white/40 text-white font-semibold text-base transition-all hover:bg-white/5">
              ERP Service Overview
            </Link>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="bg-white section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="Core Modules"
            title="A complete business operations platform"
            className="mb-14"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((mod) => (
              <div key={mod.num} className="p-6 rounded-2xl bg-[#F5F7FA] border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="text-3xl font-black text-blue-100 mb-3">{mod.num}</div>
                <h3 className="font-bold text-gray-900 mb-2">{mod.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{mod.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-[#F5F7FA] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader eyebrow="System Capabilities" title="Built for full operational control" className="mb-14" />
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
          <SectionHeader eyebrow="FAQs" title="Common questions about our ERP system" className="mb-12" />
          <FAQAccordion items={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      <CTASection
        headline="Ready to connect your entire business in one system?"
        subheadline="Let's discuss your operations and configure the right ERP system for your business."
        primaryCTA={{ label: "Request a Demo", href: "/contact" }}
        secondaryCTA={{ label: "View All Products", href: "/products" }}
      />
    </>
  );
}
