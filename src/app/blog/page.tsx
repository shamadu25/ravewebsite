import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Tag } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import CTASection from "@/components/ui/CTASection";
import { BLOG_POSTS } from "@/lib/data";

export const metadata: Metadata = {
  title: "Blog | RaveSoft Digital Solutions — Software Insights for African Businesses",
  description:
    "Practical guides on POS systems, custom software costs, hospital management software, school management systems, hotel software, HR & payroll, and why RaveSoft is the best software company in Ghana and Africa.",
  keywords: [
    "best POS system Ghana",
    "software companies in Ghana",
    "custom software development cost Ghana",
    "hospital management system Nigeria Ghana",
    "school management system Ghana",
    "hotel management system Africa",
    "HR payroll software Ghana Nigeria",
    "RaveSoft software company",
  ],
};

export default function BlogPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative bg-[#050816] pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bg-grid-dark inset-0 opacity-60" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-700/14 rounded-full blur-[130px]" />
          <div className="absolute top-1/2 right-1/3 -translate-y-1/2 w-[280px] h-[280px] bg-purple-600/5 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/12 border border-blue-500/25 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-sm text-blue-400 font-semibold">Insights & Resources</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.08] tracking-tighter mb-6 max-w-4xl mx-auto">
            Technology Insights for{" "}
            <span style={{background:"linear-gradient(135deg,#818CF8,#60A5FA)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              Business Leaders
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mx-auto">
            Practical insights on software development, digital transformation, business
            automation, and technology strategy from the RaveSoft team.
          </p>
        </div>
      </section>

      {/* BLOG POSTS */}
      <section className="bg-[#F8FAFB] section-padding">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10">
          <SectionHeader
            eyebrow="Latest Articles"
            title="Practical guides and insights from our team"
            className="mb-14"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post, i) => (
              <article
                key={post.id}
                className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden hover:border-blue-200/80 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group hover:-translate-y-1 flex flex-col"
              >
                {/* Thumbnail placeholder */}
                <div className="h-44 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-200 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-blue-600" />
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                      {post.category}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {post.readTime}
                    </div>
                  </div>

                  <h2 className="font-bold text-gray-900 mb-2 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{post.date}</span>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Read more
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Ready to transform your business with the right technology?"
        subheadline="Talk to our team about your business goals and we will recommend the right approach."
        primaryCTA={{ label: "Start a Project", href: "/contact" }}
        secondaryCTA={{ label: "Book a Consultation", href: "/book-consultation" }}
      />
    </>
  );
}
