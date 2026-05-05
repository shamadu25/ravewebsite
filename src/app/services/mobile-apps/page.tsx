import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";
import FAQAccordion from "@/components/ui/FAQAccordion";

export const metadata: Metadata = {
  title: "Mobile App Development | RaveSoft Digital Solutions",
  description:
    "RaveSoft builds cross-platform mobile applications for iOS and Android — customer apps, operations tools, field service apps, and mobile portals for businesses.",
};

const FEATURES = [
  "Cross-platform apps (iOS & Android) with React Native or Flutter",
  "User authentication and secure session management",
  "Offline mode and background sync capabilities",
  "Push notifications and in-app messaging",
  "Payment integration (Stripe, Paystack, MTN MoMo)",
  "Geolocation, maps, and route tracking",
  "Admin dashboard and analytics backend",
  "App Store & Google Play submission support",
];

const WHO_FOR = [
  "Businesses with field teams that need mobile operations tools",
  "Companies that want to offer customers a branded app experience",
  "Startups building a mobile-first product",
  "Organizations that need offline-capable mobile data collection",
];

const FAQS = [
  {
    q: "Do you build for both iOS and Android?",
    a: "Yes. We use React Native or Flutter to build cross-platform apps that work on both iOS and Android from a single codebase, reducing cost and development time.",
  },
  {
    q: "How long does a mobile app take to build?",
    a: "Simple apps with 4–6 core screens take 6–10 weeks. Feature-rich consumer apps or complex operations tools typically take 12–20 weeks depending on scope.",
  },
  {
    q: "Can the app work without internet connection?",
    a: "Yes. We build offline-first apps that store data locally and sync to your backend when connectivity is restored. This is especially useful for field teams and remote workers.",
  },
  {
    q: "Do you handle App Store and Google Play submissions?",
    a: "Yes. We handle the full submission process for both Apple App Store and Google Play, including screenshots, descriptions, privacy policy requirements, and review resolution.",
  },
];

export default function MobileAppsPage() {
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
            <span className="text-sm text-blue-400 font-semibold">Mobile App Development</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6">
            Mobile Apps That{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              Power Your Team and Delight Customers
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            We build cross-platform mobile applications for iOS and Android — from customer-facing
            apps to internal operations tools — designed for performance, usability, and real-world
            reliability.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base transition-all" style={{background:"linear-gradient(135deg,#3B82F6,#2563eb)",boxShadow:"0 8px 32px rgba(59,130,246,0.35)"}}>
            Discuss Your App
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
              title="For businesses that need mobile technology to move faster"
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
            title="Full-featured mobile app development capabilities"
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
          <SectionHeader eyebrow="FAQs" title="Common questions about mobile app development" className="mb-12" />
          <FAQAccordion items={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Ready to build your mobile app?"
        subheadline="Share your app idea and we will help you plan and build it for real-world users."
        primaryCTA={{ label: "Start a Project", href: "/contact" }}
        secondaryCTA={{ label: "Book a Free Consultation", href: "/book-consultation" }}
      />
    </>
  );
}
