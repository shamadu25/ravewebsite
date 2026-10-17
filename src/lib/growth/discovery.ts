import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";
import { analyseWebsite, type WebsiteAnalysis } from "@/lib/os/website";
import { BUILTIN_PROFILES, GROWTH_ORG, HVAC_PROFILE, type IcpProfile } from "./config";
import { normaliseDomain, scoreCompany, type SignalEvidence } from "./icp";
import { suppressionReason } from "./suppression";

export async function getProfile(key = HVAC_PROFILE.key): Promise<IcpProfile> {
  const row = await prisma.grIcpProfile.findUnique({ where: { orgId_key: { orgId: GROWTH_ORG, key } } });
  if (!row) {
    if (BUILTIN_PROFILES[key]) return BUILTIN_PROFILES[key];
    throw new Error(`Unknown industry profile "${key}".`);
  }
  const cfg = (row.config ?? {}) as Partial<IcpProfile>;
  return { key: row.key, name: row.name, industry: row.industry, country: row.country, weights: row.weights as never, queries: cfg.queries ?? [`${row.industry} company {area}`], qualifyAt: cfg.qualifyAt ?? 60, minConfidence: cfg.minConfidence ?? 0.4 };
}

/** Maps real, fetched page content to sourced evidence. Every item cites the page it came from; nothing is inferred beyond text. */
export function evidenceFromWebsite(a: WebsiteAnalysis): SignalEvidence[] {
  const out: SignalEvidence[] = [];
  if (!a.reachable) return out;
  const src = a.url, t = a.textExcerpt.toLowerCase(), s = a.signals;
  if (s.bookingFlow) out.push({ signal: "online_booking", claim: "Website offers online booking / scheduling", sourceUrl: src });
  if (/(free (estimate|quote)|request (an? )?(estimate|quote)|get (an? )?(estimate|quote))/.test(t)) out.push({ signal: "quote_based", claim: "Website invites estimate / quote requests", sourceUrl: src });
  if (s.contactForm) out.push({ signal: "service_inquiries", claim: "Website collects service enquiries through a contact form", sourceUrl: src });
  if (s.multiLocation || /(multiple locations|our locations|service areas?)/.test(t)) out.push({ signal: "multi_location", claim: "Website lists multiple locations or service areas", sourceUrl: src });
  if (/(now hiring|careers|join our team|we(?:'| a)?re hiring|technician positions?)/.test(t)) out.push({ signal: "hiring", claim: "Website advertises open roles / hiring", sourceUrl: src });
  if (/(24\/7|24 hour|emergency service)/.test(t) && !s.liveChatPresent) out.push({ signal: "after_hours_gap", claim: "Advertises 24/7 or emergency service with no live chat / instant-reply tool visible on the page (a question to verify, not a confirmed gap)", sourceUrl: src });
  if (/(crm|servicetitan|housecall pro|jobber|fieldedge)/.test(t)) out.push({ signal: "crm_or_booking", claim: "Page mentions field-service software", sourceUrl: src });
  return out;
}

export interface Candidate { name: string; website: string; phone?: string | null; address?: string | null; category?: string | null; source: string }

export interface IngestResult { companyId: number | null; domain: string | null; outcome: "QUALIFIED" | "REVIEW" | "REJECTED" | "DUPLICATE" | "QUARANTINED"; reason: string }

/** Dedupes by official domain, checks suppression, fetches the real site, scores with evidence, persists everything with sources. */
export async function ingestCandidate(c: Candidate, profile: IcpProfile, analyse: (u: string) => Promise<WebsiteAnalysis> = analyseWebsite): Promise<IngestResult> {
  const domain = normaliseDomain(c.website);
  if (!domain) return { companyId: null, domain: null, outcome: "QUARANTINED", reason: "No valid official website; identity not reliable." };
  const existing = await prisma.grCompany.findUnique({ where: { orgId_domain: { orgId: GROWTH_ORG, domain } } });
  if (existing) return { companyId: existing.id, domain, outcome: "DUPLICATE", reason: `Already tracked as #${existing.id}.` };
  const domainBlock = await prisma.grSuppression.findFirst({ where: { orgId: GROWTH_ORG, kind: "DOMAIN", value: domain } });
  if (domainBlock) return { companyId: null, domain, outcome: "QUARANTINED", reason: `Domain suppressed: ${domainBlock.reason}` };

  const a = await analyse(`https://${domain}`);
  const evidence = evidenceFromWebsite(a);
  const scored = scoreCompany({ industryMatch: true, evidence, hasOfficialSite: a.reachable, hasPublicContact: a.emails.length > 0 || a.phones.length > 0 || !!c.phone, contradictions: 0 }, profile);
  const status = scored.decision === "QUALIFIED" ? "QUALIFIED" : scored.decision === "REVIEW" ? "REVIEW" : "REJECTED";
  const company = await prisma.grCompany.create({
    data: {
      orgId: GROWTH_ORG, profileKey: profile.key, name: c.name, domain, website: `https://${domain}`, category: c.category ?? profile.industry, country: profile.country, serviceArea: c.address ?? null, phone: c.phone ?? a.phones[0] ?? null,
      status, fitScore: scored.fitScore, readinessScore: scored.readinessScore, scoreBreakdown: { components: scored.components, source: c.source } as never, confidence: scored.confidence, useCase: scored.useCase,
      decisionReason: scored.reason, needsReview: status === "REVIEW", researchedAt: new Date(),
      evidence: { create: evidence.map((e) => ({ signal: e.signal, claim: e.claim, sourceUrl: e.sourceUrl, verified: false })) },
    },
  });
  await audit({ actor: "growth-discovery", actorType: "SYSTEM", action: "growth.company.ingest", resource: "growth_company", resourceId: company.id, output: { status, fit: scored.fitScore, evidence: evidence.length } });
  return { companyId: company.id, domain, outcome: status as IngestResult["outcome"], reason: scored.reason };
}

/** Google Places text search (official API). Returns [] with a reason when no key is configured; never fabricates candidates. */
export async function searchPlaces(query: string, limit = 20): Promise<{ candidates: Candidate[]; error?: string }> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return { candidates: [], error: "GOOGLE_PLACES_API_KEY not configured — awaiting credentials." };
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.displayName,places.websiteUri,places.nationalPhoneNumber,places.formattedAddress,places.primaryTypeDisplayName" },
    body: JSON.stringify({ textQuery: query, pageSize: Math.min(20, limit) }), signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return { candidates: [], error: `Places API ${res.status}` };
  type P = { displayName?: { text?: string }; websiteUri?: string; nationalPhoneNumber?: string; formattedAddress?: string; primaryTypeDisplayName?: { text?: string } };
  const d = (await res.json()) as { places?: P[] };
  return { candidates: (d.places ?? []).filter((p) => p.websiteUri && p.displayName?.text).map((p) => ({ name: p.displayName?.text as string, website: p.websiteUri as string, phone: p.nationalPhoneNumber ?? null, address: p.formattedAddress ?? null, category: p.primaryTypeDisplayName?.text ?? null, source: "google-places" })) };
}

export async function runDiscovery(opts: { profileKey?: string; area: string; limit?: number }) {
  const profile = await getProfile(opts.profileKey);
  const dailyTarget = Number(process.env.GROWTH_RESEARCH_DAILY_TARGET ?? 500);
  const day = new Date(); day.setUTCHours(0, 0, 0, 0);
  const doneToday = await prisma.grCompany.count({ where: { orgId: GROWTH_ORG, researchedAt: { gte: day } } });
  let budget = Math.max(0, Math.min(opts.limit ?? 20, dailyTarget - doneToday));
  const results: IngestResult[] = []; const errors: string[] = [];
  for (const q of profile.queries) {
    if (budget <= 0) break;
    const { candidates, error } = await searchPlaces(q.replace("{area}", opts.area), budget);
    if (error) { errors.push(error); break; }
    for (const c of candidates) {
      if (budget <= 0) break;
      results.push(await ingestCandidate(c, profile)); budget--;
    }
  }
  return { researchedToday: doneToday + results.length, dailyTarget, results, errors };
}

export { suppressionReason };
