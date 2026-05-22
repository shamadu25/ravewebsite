import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";
import FAQAccordion from "@/components/ui/FAQAccordion";
import SoftwareAppSchema from "@/components/seo/SoftwareAppSchema";

export const metadata: Metadata = {
  title: "Hotel Management Software Ghana | Hotel PMS & Hospitality System | RaveSoft",
  description:
    "Best hotel management software in Ghana. Complete hotel PMS covering reservations, front desk, billing, housekeeping, and reporting for hotels and hospitality businesses across Africa.",
  keywords: [
    "hotel management software Ghana",
    "hotel management system Ghana",
    "hotel PMS Ghana",
    "property management system Ghana",
    "hospitality software Ghana",
    "hotel software Africa",
  ],
};

const FEATURES = [
  "Room availability and booking management",
  "Guest check-in and check-out processing",
  "Room allocation and type management",
  "Billing, invoicing, and payment tracking",
  "Housekeeping task assignment and status",
  "Restaurant and room service orders",
  "Staff management and shift scheduling",
  "Conference room and event booking",
  "Maintenance request tracking",
  "Occupancy and revenue analytics",
  "Online booking channel integration",
  "Guest history and preferences",
];

const FAQS = [
  {
    q: "Does the hotel system integrate with online booking platforms?",
    a: "Yes. We can integrate with Booking.com, Expedia, Airbnb, and direct website booking engines to synchronize availability and reservations automatically.",
  },
  {
    q: "Can it handle multiple room types and rates?",
    a: "Yes. You can define unlimited room types, rate plans (standard, weekend, seasonal), and promotional rates. The system calculates billing automatically based on stay duration and rate.",
  },
  {
    q: "Does the system manage restaurant and room service orders?",
    a: "Yes. The hotel system includes a food and beverage module for restaurant orders and room service, with the ability to add charges directly to a guest's bill.",
  },
  {
    q: "Can guests receive digital invoices?",
    a: "Yes. Guests can receive detailed digital receipts and invoices via email or WhatsApp at checkout, with full itemization of room charges, F&B, and extras.",
  },
];

export default function HotelSystemPage() {
  return (
    <>
      <SoftwareAppSchema
        name="Hotel Management System"
        description="Hotel management software covering room booking, guest management, billing, housekeeping, staff operations, and revenue reporting for hotels and hospitality businesses across Africa."
        applicationCategory="BusinessApplication"
        url="https://ravesoftsolutions.com/products/hotel"
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
            <span className="text-sm text-blue-400 font-semibold">Hotel Management System</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6">
            Full Hotel Operations Control,{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              From Booking to Checkout
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            Our Hotel Management System gives hotels, guest houses, resorts, and lodges complete
            control over bookings, guests, billing, housekeeping, staff, and revenue — in a single
            operational platform built for African hospitality.
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
                hotel.ravesoftsolutions.com
              </div>
            </div>
            <Image
              src="/img/Hotel-management-system.png"
              alt="Hotel Management System dashboard showing room availability, guest check-ins, and revenue reports"
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
            title="Everything needed to run a well-managed property"
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
          <SectionHeader eyebrow="FAQs" title="Common questions about our Hotel Management System" className="mb-12" />
          <FAQAccordion items={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      <CTASection
        headline="Ready to run a smarter, more efficient hospitality operation?"
        subheadline="Book a demo and we will show you how our system works for your property."
        primaryCTA={{ label: "Request a Demo", href: "/contact" }}
        secondaryCTA={{ label: "View All Products", href: "/products" }}
      />
    </>
  );
}
