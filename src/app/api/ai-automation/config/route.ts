import { NextRequest, NextResponse } from "next/server";
import { getIndustryConfigs, getQuestionSet } from "@/lib/ai-automation/repo";
import { STAGES } from "@/lib/ai-automation/catalogue";

/** Public, cacheable assessment configuration: industries + the ordered questions for the chosen industry. */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("industry") ?? "other";
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) return NextResponse.json({ error: "Invalid industry." }, { status: 400 });
  const industries = (await getIndustryConfigs()).map((i) => ({ slug: i.slug, name: i.name, hasPage: i.hasPage, intro: i.content.assessmentIntro }));
  if (!industries.some((i) => i.slug === slug)) return NextResponse.json({ error: "Unknown industry." }, { status: 404 });
  return NextResponse.json({ industry: slug, industries, stages: STAGES, questions: await getQuestionSet(slug) }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
