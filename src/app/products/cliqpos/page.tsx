import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, ShoppingCart, Utensils, Pill, Package, Building2 } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";
import FAQAccordion from "@/components/ui/FAQAccordion";
import SoftwareAppSchema from "@/components/seo/SoftwareAppSchema";

export const metadata: Metadata = {
  title: "CliqPOS — Cloud POS System for Retail & Hospitality | RaveSoft",
  description:
    "CliqPOS is RaveSoft's cloud-based Point of Sale and business management system for retail, restaurants, supermarkets, pharmacies, and multi-branch businesses in Ghana and Africa.",
};

const FEATURES = [
  "Sales tracking and instant receipts",
  "Inventory and stock level management",
  "Barcode scanning and receipt printing",
  "Multi-branch visibility and stock transfers",
  "Customer management and loyalty tracking",
  "Supplier management and purchase orders",
  "Staff accounts with role-based permissions",
  "Daily, weekly, and monthly sales reports",
  "End-of-day cash reconciliation",
  "Offline mode with automatic cloud sync",
];

const INDUSTRIES = [
  { icon: <ShoppingCart className="w-5 h-5" />, name: "Retail Stores & Supermarkets" },
  { icon: <Utensils className="w-5 h-5" />, name: "Restaurants & Food Service" },
  { icon: <Pill className="w-5 h-5" />, name: "Pharmacies & Medical Shops" },
  { icon: <Package className="w-5 h-5" />, name: "Wholesale & Distribution" },
  { icon: <Building2 className="w-5 h-5" />, name: "Multi-branch Businesses" },
];

const FAQS = [
  {
    q: "Does CliqPOS work without internet?",
    a: "Yes. CliqPOS is built with offline-first architecture. Your team can continue selling even without internet and all transactions sync automatically when connectivity is restored.",
  },
  {
    q: "Can I manage multiple branches from one account?",
    a: "Yes. The multi-branch module gives you a central dashboard to monitor all branches, view consolidated reports, manage staff, and transfer stock between locations.",
  },
  {
    q: "Does CliqPOS support barcode scanning and receipt printing?",
    a: "Yes. CliqPOS is compatible with USB and Bluetooth barcode scanners and thermal receipt printers. We help you set up your hardware during onboarding.",
  },
  {
    q: "Can I customize CliqPOS for my specific business type?",
    a: "Yes. CliqPOS supports multiple business profiles. Restaurants get table management and kitchen display features; pharmacies get prescription tracking; retailers get category-based product management.",
  },
  {
    q: "What reports does CliqPOS generate?",
    a: "CliqPOS generates daily sales summaries, product performance reports, inventory movement reports, staff sales reports, customer purchase history, and financial profit/loss reports.",
  },
];

export default function CliqPOSPage() {
  return (
    <>
      <SoftwareAppSchema
        name="CliqPOS"
        description="Cloud-based Point of Sale and business management system for retail, restaurants, supermarkets, pharmacies, and multi-branch businesses in Ghana and Africa."
        applicationCategory="BusinessApplication"
        url="https://ravesoftsolutions.com/products/cliqpos"
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
          <div className="flex items-center justify-center gap-3 mt-4 mb-7">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/12 border border-blue-500/25">
              <span className="text-sm text-blue-400 font-semibold">CliqPOS</span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Most Popular
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6">
            The POS System Built for{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              African Retail & Hospitality
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            CliqPOS is a cloud-based Point of Sale and business management platform for retail
            stores, supermarkets, restaurants, pharmacies, wholesale businesses, and multi-branch
            operations. Built for reliability, speed, and real-world conditions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-all shadow-xl shadow-blue-600/30">
              Get a Free Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/20 hover:border-white/40 text-white font-semibold text-base transition-all hover:bg-white/5">
              Get Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* WHO USES IT */}
      <section className="bg-white section-padding border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          {/* Dashboard mockup */}
          <div className="relative rounded-2xl overflow-hidden border border-gray-200/80 shadow-2xl shadow-gray-300/40 mb-16">
            {/* browser chrome bar */}
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-3 bg-white rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-400 font-mono">
                app.cliqpos.com
              </div>
            </div>
            <Image
              src="/img/CliqPOS-dashboard-mockup.png"
              alt="CliqPOS dashboard showing sales overview, inventory status, and business reports"
              width={1280}
              height={720}
              className="w-full h-auto"
              priority
            />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>
          <SectionHeader
            eyebrow="Who Uses CliqPOS"
            title="Trusted by businesses that handle real daily transactions"
            className="mb-12"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {INDUSTRIES.map((ind) => (
              <div key={ind.name} className="flex flex-col items-center text-center p-5 rounded-2xl bg-[#F5F7FA] border border-gray-100">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                  {ind.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">{ind.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-[#F5F7FA] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="System Features"
            title="Everything you need to run and grow your business"
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
          <SectionHeader eyebrow="FAQs" title="Common questions about CliqPOS" className="mb-12" />
          <FAQAccordion items={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Ready to get CliqPOS running in your business?"
        subheadline="Book a free demo and we will show you how CliqPOS works for your business type."
        primaryCTA={{ label: "Book a Free Demo", href: "/contact" }}
        secondaryCTA={{ label: "View All Products", href: "/products" }}
      />
    </>
  );
}
