import type { Metadata } from "next";
import type { IndustryConfig } from "./types";
import { GENERAL_SEO } from "./content/general";

export const SITE = "https://ravesoftsolutions.com";
export const GENERAL_PATH = "/ai-automation";
export const industryPath = (slug: string) => `/ai-automation/${slug}`;
const OG_IMAGE = { url: `${SITE}/img/business-automation.png`, width: 1672, height: 941 };

export function buildMetadata(o: { title: string; description: string; path: string; keywords: string[]; image?: { url: string; alt: string }; noindex?: boolean }): Metadata {
  const url = `${SITE}${o.path}`;
  return {
    // `absolute` so the site template does not append the brand a second time.
    title: { absolute: o.title },
    description: o.description,
    keywords: o.keywords,
    alternates: { canonical: url },
    robots: o.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { type: "website", url, siteName: "RaveSoft Digital Solutions", title: o.title, description: o.description, images: [{ ...OG_IMAGE, url: o.image?.url ?? OG_IMAGE.url, alt: o.image?.alt ?? "RaveSoft AI automation" }] },
    twitter: { card: "summary_large_image", title: o.title, description: o.description, images: [o.image?.url ?? OG_IMAGE.url] },
  };
}

export const generalMetadata = (): Metadata => buildMetadata({ ...GENERAL_SEO, path: GENERAL_PATH });
export const industryMetadata = (i: IndustryConfig): Metadata => buildMetadata({ title: i.seo.title, description: i.seo.description, keywords: i.seo.keywords, path: industryPath(i.slug), image: i.seo.ogImage ? { url: i.seo.ogImage.startsWith("http") ? i.seo.ogImage : `${SITE}${i.seo.ogImage}`, alt: i.content.hero.image.alt } : { url: OG_IMAGE.url, alt: i.content.hero.image.alt } });

export function serviceJsonLd(o: { name: string; description: string; path: string; audience?: string[] }) {
  return {
    "@context": "https://schema.org", "@type": "Service", name: o.name, description: o.description, url: `${SITE}${o.path}`,
    serviceType: "AI business automation", provider: { "@type": "Organization", "@id": `${SITE}/#organization`, name: "RaveSoft Digital Solutions Ltd" },
    ...(o.audience?.length ? { audience: o.audience.map((a) => ({ "@type": "Audience", audienceType: a })) } : {}),
  };
}
