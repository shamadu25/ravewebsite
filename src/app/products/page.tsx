import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import ProductCard from "@/components/ui/ProductCard";
import CTASection from "@/components/ui/CTASection";
import { PRODUCTS } from "@/lib/data";

export const metadata: Metadata = {
  title: "Business Software Products in Ghana | POS, ERP, Hospital, School & Hotel Systems",
  description:
    "Explore RaveSoft's ready-to-deploy business software products for Ghana and Africa: CliqPOS (cloud POS), ERP system, hospital management, school management, and hotel management systems.",
  keywords: [
    "software products Ghana",
    "POS system Ghana",
    "ERP system Ghana",
    "hospital management system Ghana",
    "school management system Ghana",
    "hotel management software Ghana",
    "business software products Africa",
  ],
};

export default function ProductsPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative bg-[#050816] pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bg-grid-dark inset-0 opacity-60" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-700/14 rounded-full blur-[130px]" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/6 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/12 border border-blue-500/25 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-sm text-blue-400 font-semibold">Software Products</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6 max-w-4xl mx-auto">
            Business Software Products{" "}
            <span style={{background:"linear-gradient(135deg,#60A5FA,#818CF8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              Built From Real Operational Experience
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto">
            RaveSoft builds and operates its own suite of industry-specific software products
            designed for the realities of African business operations. Ready to deploy, configurable
            to your needs, and backed by our full support team.
          </p>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="bg-[#050816] section-padding border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-50 pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRODUCTS.map((product, i) => (
              <ProductCard
                key={product.id}
                name={product.name}
                tagline={product.tagline}
                price={product.price}
                description={product.description}
                features={product.features}
                industries={product.industries}
                href={product.href}
                cta={product.cta}
                badge={product.badge}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CUSTOM PRODUCT NOTE */}
      <section className="bg-[#F8FAFB] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <SectionHeader
            eyebrow="Custom Products"
            title="Need a product built specifically for your industry?"
            description="Our existing products are designed for the most common use cases. If your industry has unique requirements, we can build a custom product from the ground up or extend an existing one with modules tailored to your operations."
            className="mb-10"
          />
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base transition-all"
            style={{background:"linear-gradient(135deg,#3B82F6,#2563eb)",boxShadow:"0 8px 32px rgba(59,130,246,0.35)"}}
          >
            Discuss a Custom Product
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Ready to deploy a business management system?"
        subheadline="We will configure the right product for your operations and get you running fast."
        primaryCTA={{ label: "Get a Demo", href: "/contact" }}
        secondaryCTA={{ label: "View Services", href: "/services" }}
      />
    </>
  );
}
