import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Layers } from "lucide-react";
import {
  ShoppingCart, UtensilsCrossed, Heart, GraduationCap, Building2,
  Globe2, Truck, Home, Briefcase, TrendingUp,
} from "lucide-react";
import { INDUSTRIES } from "@/lib/data";
import CTASection from "@/components/ui/CTASection";

type IndustrySlugParams = { params: Promise<{ id: string }> };

const INDUSTRY_ICONS: Record<string, React.ElementType> = {
  ShoppingCart, UtensilsCrossed, Heart, GraduationCap, Building2,
  Globe2, Truck, Home, Briefcase, TrendingUp,
};

// Extended content per industry
const INDUSTRY_DETAILS: Record<string, {
  headline: string;
  body: string;
  challenges: string[];
  solutions: { label: string; href: string }[];
}> = {
  retail: {
    headline: "Software Built for Retail & Wholesale Operations",
    body: "Retail and wholesale businesses face unique operational complexity — managing stock across branches, tracking sales across multiple staff and registers, handling supplier orders, and generating accurate daily reports. Manual processes and generic tools slow you down and create costly errors. We build and operate systems specifically designed for how retail businesses in Ghana and across Africa actually work.",
    challenges: [
      "Inventory shrinkage from poor tracking",
      "Slow checkout losing customers",
      "No real-time visibility across branches",
      "Manual stock counting and reconciliation",
      "Poor supplier and procurement management",
      "Difficulty generating accurate business reports",
    ],
    solutions: [
      { label: "CliqPOS — Cloud POS & Business Management", href: "/products/cliqpos" },
      { label: "Custom ERP System", href: "/products/erp" },
      { label: "Business Automation", href: "/services/business-automation" },
    ],
  },
  restaurants: {
    headline: "Restaurant & Food Service Management Systems",
    body: "Restaurants and food service businesses need fast, reliable systems at the point of order. Kitchen delays, billing errors, slow checkout, and poor inventory tracking all damage profitability and customer experience. We build restaurant management systems that handle table service, kitchen orders, fast checkout, and daily reporting in one seamless platform.",
    challenges: [
      "Slow order-to-kitchen communication",
      "Manual billing errors at checkout",
      "No visibility on daily sales performance",
      "Inventory waste from poor stock tracking",
      "Table management complexity",
      "Difficulty managing multiple service areas",
    ],
    solutions: [
      { label: "Restaurant POS System", href: "/products/cliqpos" },
      { label: "Custom Software Development", href: "/services/custom-software" },
      { label: "Business Automation", href: "/services/business-automation" },
    ],
  },
  healthcare: {
    headline: "Digital Systems for Hospitals, Clinics & Healthcare",
    body: "Healthcare operations require precision, accountability, and speed. Manual patient records, paper-based billing, and disconnected pharmacy and lab processes create delays that affect patient care and operational efficiency. Our hospital management system integrates every function — from registration to discharge — in a secure, role-based platform.",
    challenges: [
      "Manual patient registration and record keeping",
      "Billing errors and delayed payments",
      "Disconnected pharmacy and lab processes",
      "Poor appointment and queue management",
      "No visibility on clinical and financial performance",
      "Staff accountability gaps",
    ],
    solutions: [
      { label: "Hospital Management System", href: "/products/hospital" },
      { label: "Custom Healthcare Software", href: "/services/custom-software" },
      { label: "Business Automation", href: "/services/business-automation" },
    ],
  },
  education: {
    headline: "School & Educational Institution Management",
    body: "Schools and educational institutions manage complex administrative workflows — admissions, fees, attendance, results, and parent communication — often across multiple terms and academic years. Our School Management System automates these processes, eliminates manual registers and spreadsheets, and gives school administration the tools to run efficiently and professionally.",
    challenges: [
      "Manual fee collection and tracking",
      "Paper-based attendance registers",
      "Manual report card compilation",
      "Poor parent communication",
      "No centralized student records",
      "Exam result and grading inefficiencies",
    ],
    solutions: [
      { label: "School Management System", href: "/products/school" },
      { label: "Custom Software Development", href: "/services/custom-software" },
      { label: "Website & Parent Portal", href: "/services/website-design" },
    ],
  },
  hotels: {
    headline: "Hotel & Hospitality Management Software",
    body: "Hotels and hospitality businesses need seamless operations across bookings, rooms, guests, staff, billing, and housekeeping. Manual processes lead to double bookings, billing errors, and poor guest experience. Our Hotel Management System gives hospitality businesses complete operational control from a single platform built for the African market.",
    challenges: [
      "Double bookings from manual management",
      "Billing errors at checkout",
      "Poor housekeeping coordination",
      "No visibility on room occupancy and revenue",
      "Manual reporting taking excessive time",
      "Disconnected food and beverage billing",
    ],
    solutions: [
      { label: "Hotel Management System", href: "/products/hotel" },
      { label: "Custom Software Development", href: "/services/custom-software" },
      { label: "Business Automation", href: "/services/business-automation" },
    ],
  },
  ngos: {
    headline: "Digital Presence & Platforms for NGOs and Nonprofits",
    body: "NGOs and nonprofit organizations need digital platforms that build credibility, communicate impact, support donor trust, and manage content across programs and geographies. We build premium digital platforms for international and regional organizations that reflect the quality of their work and strengthen their online presence.",
    challenges: [
      "Outdated websites that undermine credibility",
      "Difficult content management for non-technical staff",
      "Country and program-level navigation complexity",
      "Poor search engine visibility",
      "Weak donor trust signals",
      "Slow and mobile-unfriendly platforms",
    ],
    solutions: [
      { label: "Premium Website Design", href: "/services/website-design" },
      { label: "Custom Software & CMS", href: "/services/custom-software" },
      { label: "SaaS & Platform Development", href: "/services/saas-development" },
    ],
  },
  logistics: {
    headline: "Fleet, Delivery & Logistics Management Systems",
    body: "Logistics and transport businesses operate in fast-moving, high-pressure environments where visibility, coordination, and billing accuracy directly affect profitability. We build fleet management systems, delivery tracking platforms, and dispatch tools that give logistics businesses real-time operational control.",
    challenges: [
      "Poor fleet visibility and tracking",
      "Manual dispatch coordination errors",
      "Billing disputes from poor documentation",
      "Driver accountability gaps",
      "No real-time delivery status for clients",
      "Manual route and load management",
    ],
    solutions: [
      { label: "Custom Fleet Management System", href: "/services/custom-software" },
      { label: "Mobile App Development", href: "/services/mobile-apps" },
      { label: "Business Automation", href: "/services/business-automation" },
    ],
  },
  "real-estate": {
    headline: "Property, Listings & CRM Platforms for Real Estate",
    body: "Real estate agencies and property developers need professional digital tools to manage listings, clients, transactions, and communications. We build property CRM systems, modern listings websites, and client portals that give real estate businesses a professional edge and better operational efficiency.",
    challenges: [
      "Manual client and deal tracking",
      "Poor online property listings presence",
      "No CRM for agent-client relationships",
      "Manual contract and document management",
      "Payment tracking complexity",
      "Weak online credibility",
    ],
    solutions: [
      { label: "Custom CRM System", href: "/services/custom-software" },
      { label: "Professional Website", href: "/services/website-design" },
      { label: "Business Automation", href: "/services/business-automation" },
    ],
  },
  "professional-services": {
    headline: "Digital Tools for Consultancies & Service Businesses",
    body: "Professional service businesses — consultancies, law firms, accounting firms, agencies — need websites that project credibility, CRM systems that manage client relationships, and automation tools that handle the administrative overhead of running a service business. We build the digital infrastructure that lets professional services firms focus on client work.",
    challenges: [
      "Website that doesn't reflect professional quality",
      "Manual client onboarding and communication",
      "No system for tracking project progress",
      "Invoice and payment tracking in spreadsheets",
      "Missed follow-ups losing potential clients",
      "Time spent on administrative tasks",
    ],
    solutions: [
      { label: "Professional Website Design", href: "/services/website-design" },
      { label: "Custom Software & CRM", href: "/services/custom-software" },
      { label: "Business Automation", href: "/services/business-automation" },
    ],
  },
  "financial-services": {
    headline: "Secure Digital Platforms for Financial Services",
    body: "Financial services businesses operate in a high-trust, high-compliance environment where security, reliability, and user experience are non-negotiable. We build secure fintech platforms, client dashboards, reporting systems, and digital financial tools for financial services businesses operating in Africa and beyond.",
    challenges: [
      "Need for secure, compliant digital platforms",
      "Complex client dashboard and reporting requirements",
      "Integration with payment systems and banks",
      "Regulatory compliance and audit requirements",
      "Manual reporting and reconciliation processes",
      "Weak digital presence in a competitive market",
    ],
    solutions: [
      { label: "Custom Platform Development", href: "/services/custom-software" },
      { label: "SaaS & Fintech Development", href: "/services/saas-development" },
      { label: "Business Automation", href: "/services/business-automation" },
    ],
  },
};

export async function generateStaticParams() {
  return INDUSTRIES.map((ind) => ({ id: ind.id }));
}

export async function generateMetadata({ params }: IndustrySlugParams): Promise<Metadata> {
  const { id } = await params;
  const industry = INDUSTRIES.find((ind) => ind.id === id);
  if (!industry) return {};
  const detail = INDUSTRY_DETAILS[id];
  return {
    title: `${industry.name} Software Solutions | RaveSoft`,
    description: detail?.body.slice(0, 155) ?? industry.description,
  };
}

export default async function IndustryPage({ params }: IndustrySlugParams) {
  const { id } = await params;
  const industry = INDUSTRIES.find((ind) => ind.id === id);
  if (!industry) notFound();

  const detail = INDUSTRY_DETAILS[id];
  const IconComponent = INDUSTRY_ICONS[industry.icon] ?? Layers;
  const related = INDUSTRIES.filter((ind) => ind.id !== id).slice(0, 4);

  return (
    <>
      {/* HERO */}
      <section className="bg-[#050816] pt-32 pb-16 lg:pt-40">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <Link href="/industries" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8">
            ← All Industries
          </Link>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <IconComponent className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-blue-400 font-semibold">{industry.name}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.08] tracking-tighter mb-5">
            {detail?.headline ?? `Software Solutions for ${industry.name}`}
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl">
            {detail?.body ?? industry.description}
          </p>
        </div>
      </section>

      {/* CHALLENGES + SOLUTIONS */}
      <section className="bg-[#F5F7FA] py-16 lg:py-20">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 lg:grid lg:grid-cols-2 lg:gap-16">
          {/* Challenges */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Common Challenges We Solve</h2>
            <div className="space-y-3">
              {(detail?.challenges ?? []).map((c, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-100">
                  <div className="w-5 h-5 rounded-full bg-red-100 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  </div>
                  <span className="text-gray-700 text-sm font-medium leading-relaxed">{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Solutions */}
          <div className="mt-10 lg:mt-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Solutions for {industry.name}</h2>
            <div className="space-y-4">
              {(detail?.solutions ?? industry.solutions.map(s => ({ label: s, href: "/services" }))).map((s, i) => (
                <Link
                  key={i}
                  href={s.href}
                  className="flex items-center justify-between gap-4 p-5 rounded-xl bg-white border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    <span className="text-gray-800 font-semibold text-sm">{s.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
                </Link>
              ))}
            </div>

            {/* Other industries */}
            <div className="mt-10">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                Other Industries
              </h3>
              <div className="flex flex-wrap gap-2">
                {related.map((ind) => (
                  <Link
                    key={ind.id}
                    href={`/industries/${ind.id}`}
                    className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-blue-300 text-sm text-gray-700 hover:text-blue-700 font-medium transition-all"
                  >
                    {ind.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTASection
        headline={`Ready to modernize your ${industry.name.toLowerCase()} operations?`}
        subheadline="Let's talk about your specific needs and build the right solution for your business."
        primaryCTA={{ label: "Start a Conversation", href: "/contact" }}
        secondaryCTA={{ label: "View Our Work", href: "/case-studies" }}
      />
    </>
  );
}
