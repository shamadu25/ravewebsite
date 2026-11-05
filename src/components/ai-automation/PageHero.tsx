import Image from "next/image";
import { Check } from "lucide-react";
import { Breadcrumbs, Container, CtaLink } from "./ui";
import HeroStarter from "./HeroStarter";
import AnalysisPreview from "./AnalysisPreview";

interface Props {
  breadcrumbs: Array<{ name: string; href?: string }>;
  eyebrow: string;
  headline: string;
  subcopy: string;
  points: string[];
  image: { src: string; alt: string };
  primary: string;
  secondary: string;
  secondaryHref: string;
  industries: Array<{ slug: string; name: string }>;
  industry?: { slug: string; name: string };
}

/** Shared hero for the general page and every industry page: message, real photo, analysis preview and a compact six-step starter. */
export default function PageHero({ breadcrumbs, eyebrow, headline, subcopy, points, image, primary, secondary, secondaryHref, industries, industry }: Props) {
  return (
    <section className="relative overflow-hidden bg-[#071536] pb-14 pt-28 text-white sm:pb-16 lg:pb-20 lg:pt-32" aria-labelledby="hero-title">
      <Container>
        <Breadcrumbs dark items={breadcrumbs} />
        <div className="grid items-start gap-x-14 gap-y-8 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="lg:col-start-1 lg:row-start-1">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#FFB200]">{eyebrow}</p>
            <h1 id="hero-title" className="text-[2rem] font-bold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.85rem]">{headline}</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">{subcopy}</p>
            <ul className="mt-6 space-y-2.5">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[15px] text-slate-100"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB200]" aria-hidden="true" /><span>{p}</span></li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaLink href="#assessment">{primary}</CtaLink>
              <CtaLink href={secondaryHref} variant="secondary" onDark>{secondary}</CtaLink>
            </div>
          </div>
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-lg border border-white/10">
              <Image src={image.src} alt={image.alt} width={1672} height={941} priority sizes="(min-width: 1024px) 520px, 92vw" className="h-auto w-full" />
            </div>
            <div className="relative -mt-10 px-3 sm:px-5"><HeroStarter industries={industries} initialIndustry={industry?.slug} industryName={industry?.name} /></div>
          </div>
          <div className="lg:col-start-1 lg:row-start-2"><AnalysisPreview industry={industry?.name.toLowerCase()} /></div>
        </div>
      </Container>
    </section>
  );
}
