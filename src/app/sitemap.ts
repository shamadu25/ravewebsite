import type { MetadataRoute } from "next";
import { BLOG_POSTS, CASE_STUDIES, INDUSTRIES } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ravesoftsolutions.com";

  const blogRoutes = BLOG_POSTS.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const caseStudyRoutes = CASE_STUDIES.map((c) => ({
    url: `${base}/case-studies/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const industryRoutes = INDUSTRIES.map((i) => ({
    url: `${base}/industries/${i.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/services`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/services/custom-software`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/services/saas-development`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/services/website-design`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/services/mobile-apps`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/services/business-automation`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/services/pos-erp`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/products`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/industries`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/case-studies`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/book-consultation`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/products/cliqpos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/products/erp`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/products/hospital`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/products/school`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/products/hotel`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    ...blogRoutes,
    ...caseStudyRoutes,
    ...industryRoutes,
  ];
}
