import { prisma } from "@/lib/prisma";
import { ORG_ID } from "../constants";
import { COMPANY, FAQ_ITEMS, CASE_STUDIES, INDUSTRIES, PRODUCTS, SERVICES } from "@/lib/data";
import { DEFAULT_TEMPLATES } from "../recommend";

interface Entry { section: string; title: string; content: string; tags?: string[]; sourceUrl?: string }

const list = (xs?: readonly string[]) => (xs?.length ? xs.map((x) => `- ${x}`).join("\n") : "");

/** Builds Company Brain entries from the website's own structured content, so agents quote only facts RaveSoft already publishes. */
export function companyKnowledge(): Entry[] {
  const e: Entry[] = [];
  e.push({ section: "Mission", title: "Company profile", content: `${COMPANY.name} — ${COMPANY.tagline}.\n${COMPANY.description}\nBased in ${COMPANY.location}. Contact: ${COMPANY.email}, WhatsApp ${COMPANY.whatsapp}. Website: ${COMPANY.website}.` });

  for (const p of PRODUCTS) {
    e.push({ section: "Products", title: `Product: ${p.name}`, tags: [p.id, "product"], sourceUrl: `${COMPANY.website}${p.href}`, content: `${p.name} — ${p.tagline}.\n${p.description}\nKey features:\n${list(p.features)}\nBest for: ${(p.industries ?? []).join(", ")}.` });
  }
  for (const s of SERVICES) {
    e.push({ section: "Products", title: `Service: ${s.title}`, tags: [s.id, "service"], sourceUrl: `${COMPANY.website}/services/${s.slug}`, content: `${s.title}.\n${s.description}\nBenefits:\n${list(s.benefits)}\nWhat we build:\n${list(s.whatWeBuild)}` });
  }
  for (const i of INDUSTRIES) {
    e.push({ section: "Prospects", title: `Target segment: ${i.name}`, tags: [i.id, "segment", "icp"], content: `${i.name}: ${i.description}\nRaveSoft solutions that fit: ${i.solutions.join(", ")}.` });
  }
  for (const c of CASE_STUDIES) {
    e.push({ section: "Marketing", title: `Proof: ${c.title}`, tags: [c.id, "case-study", "proof"], sourceUrl: `${COMPANY.website}/case-studies/${c.slug}`, content: `${c.title} (${c.industry}).\nProblem: ${c.problem}\nSolution: ${c.solution}\nResult: ${c.result}` });
  }
  for (const f of FAQ_ITEMS) {
    e.push({ section: "Support", title: `FAQ: ${f.question}`, tags: ["faq"], content: `Q: ${f.question}\nA: ${f.answer}` });
  }

  e.push({ section: "Brand", title: "Brand voice (draft — edit to taste)", content: "Plain, practical and warm. Speak to business owners in Ghana, Nigeria, Kenya and across Africa about real problems: lost enquiries, manual stock and sales tracking, slow follow-up. Short sentences. Concrete benefits over buzzwords. Never hype, never invent numbers or customers. Always offer a clear next step." });
  e.push({ section: "Policies", title: "Claims policy", content: "Agents may only state facts present in the Company Brain. Never invent statistics, customer names, discounts or delivery promises. Pricing for custom work is confirmed by a human; the website promises a fixed quote within 24 hours of a consultation. If unsure, escalate to a human." });
  e.push({ section: "Pricing", title: "AI Employee pricing (working assumptions — CONFIRM before quoting)", content: `Indicative monthly prices used by the opportunity engine (editable in the AI employee factory):\n${DEFAULT_TEMPLATES.map((t) => `- ${t.name} (${t.industry}): $${t.monthlyPriceUsd}/month`).join("\n")}\nCliqPOS and custom software pricing are not published; a human confirms them.` });
  e.push({ section: "Revenue Goals", title: "Revenue engines", content: "$500K ARR is built from three engines: (1) SaaS — CliqPOS, KOVABOT, HMS, Restovax; (2) AI Employee services — setup, automation implementation, custom AI Employees; (3) Enterprise — custom workflows and AI workforce transformation. Every agent's work should move a prospect toward a paying recurring customer in one of these engines." });
  return e;
}

/** Idempotent: adds missing entries, never overwrites ones a human has edited. */
export async function seedCompanyKnowledge(): Promise<number> {
  const existing = await prisma.osBrainEntry.findMany({ where: { orgId: ORG_ID }, select: { section: true, title: true } });
  const have = new Set(existing.map((x) => `${x.section}::${x.title}`));
  let created = 0;
  for (const k of companyKnowledge()) {
    if (have.has(`${k.section}::${k.title}`)) continue;
    await prisma.osBrainEntry.create({ data: { orgId: ORG_ID, section: k.section, title: k.title, content: k.content, tags: k.tags ?? [], sourceUrl: k.sourceUrl ?? null, createdBy: "site-data" } });
    created++;
  }
  return created;
}
