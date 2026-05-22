import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";
import FAQAccordion from "@/components/ui/FAQAccordion";
import FAQSchema from "@/components/seo/FAQSchema";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "Website Design Company in Ghana | Professional Web Development | RaveSoft",
  description:
    "Best website design company in Ghana. We design and build professional corporate websites, e-commerce stores, NGO websites, and landing pages that rank on Google and convert visitors into leads.",
  keywords: [
    "website design Ghana",
    "web design company Ghana",
    "website development Ghana",
    "web development company Ghana",
    "e-commerce website Ghana",
    "professional website design Africa",
  ],
};

const FEATURES = [
  "Custom design (no templates) built around your brand",
  "Mobile-first, responsive across all screen sizes",
  "Fast loading speed (Core Web Vitals optimized)",
  "SEO-optimized structure, metadata, and content",
  "CMS integration (Sanity, Contentful, WordPress)",
  "Contact forms, lead capture, and CTA flows",
  "Google Analytics and tracking setup",
  "Domain, hosting setup, and deployment",
  "Ongoing maintenance and content updates",
];

const WHO_FOR = [
  "Businesses that need a professional online presence",
  "Startups launching their first product or service",
  "NGOs and nonprofits needing a credible web presence",
  "Companies with outdated websites that don't convert",
  "Professionals who need a personal or portfolio website",
];

const FAQS = [
  {
    q: "How long does a website project take?",
    a: "Most business websites take 3–6 weeks from start to launch. Larger multi-page sites with custom features may take 6–10 weeks. We always provide a clear timeline before starting.",
  },
  {
    q: "Do you build on WordPress or custom?",
    a: "Both. We build custom Next.js websites for businesses that need performance and flexibility, and WordPress or Webflow sites for businesses that prefer a no-code CMS for content management.",
  },
  {
    q: "Will my website rank on Google?",
    a: "We build with SEO best practices from day one — semantic HTML, metadata, structured data, fast load times, and mobile responsiveness. We also integrate Google Search Console and Analytics.",
  },
  {
    q: "Can I update the website content myself after launch?",
    a: "Yes. We set up a CMS (Content Management System) so you or your team can update text, images, blog posts, and other content without touching code.",
  },
];

export default function WebsiteDesignPage() {
  return (
    <>
      <FAQSchema items={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://ravesoftsolutions.com" },
        { name: "Services", url: "https://ravesoftsolutions.com/services" },
        { name: "Website Design & Development", url: "https://ravesoftsolutions.com/services/website-design" },
      ]} />
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
            <span className="text-sm text-blue-400 font-semibold">Website Design & Development</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6">
            Websites That{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              Look Premium and Drive Results
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            We design and build professional websites for businesses, startups, NGOs, and
            enterprises. Every site we build is fast, mobile-optimized, SEO-ready, and built to
            convert visitors into customers.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base transition-all" style={{background:"linear-gradient(135deg,#3B82F6,#2563eb)",boxShadow:"0 8px 32px rgba(59,130,246,0.35)"}}>
            Get a Website Proposal
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
              title="For every business that needs a website that works"
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
            eyebrow="What's Included"
            title="Every website we build comes ready for real business"
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
          <SectionHeader eyebrow="FAQs" title="Common questions about website design" className="mb-12" />
          <FAQAccordion items={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Ready for a website that represents your business professionally?"
        subheadline="Let's discuss your goals, your audience, and the right approach for your new site."
        primaryCTA={{ label: "Start a Project", href: "/contact" }}
        secondaryCTA={{ label: "View Our Work", href: "/case-studies" }}
      />
    </>
  );
}
