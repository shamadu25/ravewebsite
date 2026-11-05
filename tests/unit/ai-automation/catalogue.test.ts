/** @jest-environment node */
import { INDUSTRY_SEEDS, PAGE_INDUSTRY_SLUGS, SOLUTION_SEEDS, UNIVERSAL_QUESTIONS, buildQuestionSet, STAGES } from "@/lib/ai-automation/catalogue";
import { IndustryContentSchema, QuestionSchema } from "@/lib/ai-automation/types";
import { GENERAL_SEO, HERO, AUTOMATE, INDUSTRY_BLURBS, GENERAL_FAQS } from "@/lib/ai-automation/content/general";
import { industryPath } from "@/lib/ai-automation/seo";
import { isVisible } from "@/lib/ai-automation/validation";

const pages = INDUSTRY_SEEDS.filter((i) => i.hasPage);
const by = (slug: string) => INDUSTRY_SEEDS.find((i) => i.slug === slug)!;
const solutionsFor = (slug: string) => SOLUTION_SEEDS.filter((s) => slug in s.industries).map((s) => s.name);

describe("landing pages: general page", () => {
  it("uses the specified hero copy and CTAs", () => {
    expect(HERO.headline).toBe("Your Business Has Problems. AI Can Solve More of Them Than You Think.");
    expect(HERO.subcopy).toBe("Tell us how your business operates, the challenges slowing you down, and what you want to achieve. Our AI consultant will analyse your business and recommend the right automation solutions.");
    expect(HERO.primary).toBe("Get My Free AI Business Assessment");
    expect(HERO.secondary).toBe("Explore AI Automation Solutions");
  });
  it("lists the 11 automation areas and all 10 industries", () => {
    expect(AUTOMATE.map((a) => a.title)).toEqual(["Sales Automation", "Marketing Automation", "Lead Generation", "Customer Support", "WhatsApp Automation", "Appointment Booking", "Finance and Reporting", "HR and Recruitment", "Operations and Administration", "Business Intelligence", "Custom Workflows"]);
    expect(INDUSTRY_SEEDS.map((i) => i.name)).toEqual(expect.arrayContaining(["Retail & E-commerce", "Real Estate", "Healthcare", "Hospitality", "Logistics", "Financial Services", "Professional Services", "Manufacturing", "Education", "Other Industries"]));
    expect(INDUSTRY_SEEDS).toHaveLength(10);
    for (const i of INDUSTRY_SEEDS) expect(INDUSTRY_BLURBS[i.slug]).toBeTruthy();
  });
  it("has FAQs and unique metadata", () => {
    expect(GENERAL_FAQS.length).toBeGreaterThanOrEqual(6);
    expect(GENERAL_SEO.title.length).toBeLessThanOrEqual(62);
    expect(GENERAL_SEO.description.length).toBeLessThanOrEqual(160);
  });
});

describe("landing pages: eight industries", () => {
  it("has exactly the eight required routes", () => {
    expect(PAGE_INDUSTRY_SLUGS.sort()).toEqual(["education", "financial-services", "healthcare", "hospitality", "logistics", "professional-services", "real-estate", "retail"]);
    expect(PAGE_INDUSTRY_SLUGS.map(industryPath)).toContain("/ai-automation/real-estate");
  });
  it.each(pages.map((p) => [p.slug, p] as const))("%s has valid, complete, industry-specific content", (_s, i) => {
    expect(IndustryContentSchema.safeParse(i.content).success).toBe(true);
    const c = i.content;
    expect(c.hero.headline.length).toBeGreaterThan(20);
    expect(c.problems.length).toBeGreaterThanOrEqual(5);
    expect(c.useCases.length).toBeGreaterThanOrEqual(3);
    expect(c.integrations.length).toBeGreaterThanOrEqual(4);
    expect(c.faqs.length).toBeGreaterThanOrEqual(4);
    expect(c.related.length).toBeGreaterThanOrEqual(2);
    expect(c.cta.primary).toContain("Free");
    expect(c.audience.length).toBeGreaterThanOrEqual(4);
    expect(i.questions.length).toBeGreaterThanOrEqual(7);
    expect(solutionsFor(i.slug).length).toBeGreaterThanOrEqual(6);
    for (const q of i.questions) expect(QuestionSchema.safeParse(q).success).toBe(true);
  });
  it("is not a find-and-replace: every headline, problem set, FAQ and SEO title is unique", () => {
    const uniq = (xs: string[]) => expect(new Set(xs).size).toBe(xs.length);
    uniq(pages.map((p) => p.content.hero.headline));
    uniq(pages.map((p) => p.seo.title));
    uniq(pages.map((p) => p.seo.description));
    uniq(pages.flatMap((p) => p.content.problems.map((x) => x.title + p.slug)));
    uniq(pages.flatMap((p) => p.content.faqs.map((x) => x.q)));
    uniq(pages.flatMap((p) => p.content.useCases.map((x) => x.title)));
    // question keys are namespaced per industry, so no industry silently reuses another's questions
    const keys = pages.flatMap((p) => p.questions.map((q) => q.key));
    uniq(keys);
    for (const p of pages) { expect(p.seo.title.length).toBeLessThanOrEqual(62); expect(p.seo.description.length).toBeLessThanOrEqual(160); }
  });
  it("uses the specified headlines", () => {
    expect(by("real-estate").content.hero.headline).toBe("Sell More Properties. Lose Fewer Leads. Grow Without Expanding Your Sales Team.");
    expect(by("healthcare").content.hero.headline).toBe("Improve Patient Experience. Reduce Administrative Work. Run a Smarter Healthcare Operation.");
    expect(by("hospitality").content.hero.headline).toBe("Deliver Better Guest Experiences While Automating Your Hotel Operations.");
    expect(by("retail").content.hero.headline).toBe("Sell More. Serve Customers Faster. Automate Your Retail Operations.");
    expect(by("logistics").content.hero.headline).toBe("Automate Your Logistics Operations. Improve Visibility. Serve Customers Better.");
    expect(by("financial-services").content.hero.headline).toBe("Automate Client Workflows. Improve Service Delivery. Make Better Decisions.");
    expect(by("professional-services").content.hero.headline).toBe("Spend Less Time on Administration. Win More Clients. Deliver Better Services.");
    expect(by("education").content.hero.headline).toBe("Automate Admissions. Improve Student Support. Simplify School Administration.");
  });
  it("recommends the specified AI solutions per industry", () => {
    expect(solutionsFor("real-estate")).toEqual(expect.arrayContaining(["AI Property Sales Agent", "AI Lead Qualification Agent", "AI WhatsApp Agent", "AI Property Viewing Scheduler", "AI Lead Recovery Agent", "AI Property Marketing Agent", "AI CRM Assistant", "AI Sales Analytics Agent"]));
    expect(solutionsFor("healthcare")).toEqual(expect.arrayContaining(["AI Patient Enquiry Agent", "AI Appointment Booking Agent", "AI Patient Communication Agent", "AI Administrative Assistant", "AI Follow-up Agent", "AI Reporting Assistant", "AI Document Processing Agent"]));
    expect(solutionsFor("hospitality")).toEqual(expect.arrayContaining(["AI Reservation Agent", "AI Guest Support Agent", "AI Booking Follow-up Agent", "AI Check-in Assistant", "AI Guest Experience Agent", "AI Marketing Agent", "AI Operations Reporting Agent"]));
    expect(solutionsFor("retail")).toEqual(expect.arrayContaining(["AI Sales Agent", "AI Customer Support Agent", "AI WhatsApp Commerce Agent", "AI Customer Retention Agent", "AI Marketing Agent", "AI Inventory Alert Agent", "AI Reporting Assistant"]));
    expect(solutionsFor("logistics")).toEqual(expect.arrayContaining(["AI Dispatch Assistant", "AI Customer Communication Agent", "AI Shipment Update Agent", "AI Fleet Operations Assistant", "AI Booking Assistant", "AI Reporting Agent", "AI Document Processing Agent"]));
    expect(solutionsFor("financial-services")).toEqual(expect.arrayContaining(["AI Client Onboarding Agent", "AI Document Processing Agent", "AI Customer Support Agent", "AI Workflow Assistant", "AI Reporting Agent", "AI Compliance Support Assistant"]));
    expect(solutionsFor("professional-services")).toEqual(expect.arrayContaining(["AI Client Acquisition Agent", "AI Lead Qualification Agent", "AI Appointment Agent", "AI Document Workflow Agent", "AI Client Communication Agent", "AI Administrative Assistant", "AI Reporting Agent"]));
    expect(solutionsFor("education")).toEqual(expect.arrayContaining(["AI Admissions Agent", "AI Student Support Agent", "AI Parent Communication Agent", "AI Fee Reminder Agent", "AI Administrative Assistant", "AI Reporting Agent"]));
  });
  it("carries safeguards for regulated industries", () => {
    expect(by("healthcare").content.safeguards?.body).toMatch(/privacy/i);
    expect(by("financial-services").content.safeguards?.body).toMatch(/lending decisions/i);
    expect(by("education").content.safeguards?.body).toMatch(/safeguarding/i);
  });
  it("mentions CliqPOS only as an option for retail", () => {
    expect(by("retail").content.integrations.join(" ")).toMatch(/CliqPOS/);
    expect(by("retail").content.faqs.map((f) => f.a).join(" ")).toMatch(/do not assume it/i);
  });
});

describe("industry-specific assessment questions", () => {
  it("includes the specified real estate questions", () => {
    const labels = by("real-estate").questions.map((q) => q.label);
    for (const l of ["How many properties do you manage or market?", "How many enquiries do you receive monthly?", "Which channels generate enquiries?", "How many sales representatives do you employ?", "How are enquiries currently managed?", "How quickly are leads contacted?", "How do you schedule property viewings?", "What CRM or property management system do you use?", "What is your biggest sales bottleneck?", "What would you most like to automate?"]) expect(labels).toContain(l);
  });
  it("includes the specified healthcare, hospitality and logistics questions", () => {
    expect(by("healthcare").questions.map((q) => q.label)).toEqual(expect.arrayContaining(["What type of healthcare facility do you operate?", "How many patients do you serve monthly?", "How are appointments managed?", "How do patients contact your facility?", "How are reminders and follow-ups handled?", "Which administrative processes consume the most time?", "What management or hospital software do you use?"]));
    expect(by("hospitality").questions.map((q) => q.label)).toEqual(expect.arrayContaining(["What type of hospitality business do you operate?", "How many rooms or properties do you manage?", "How are reservations received?", "Which booking platforms do you use?", "How do you handle guest enquiries?", "How do you manage cancellations?", "Which activities require the most staff attention?", "Which hotel management software do you use?"]));
    expect(by("logistics").questions.length).toBe(7);
  });
  it("covers all six stages and never shows irrelevant industry questions", () => {
    const set = buildQuestionSet(by("healthcare").questions);
    for (const s of STAGES) expect(set.some((q) => q.stage === s.n)).toBe(true);
    expect(set.some((q) => q.key.startsWith("re_"))).toBe(false);
    expect(buildQuestionSet(by("real-estate").questions).some((q) => q.key.startsWith("hc_"))).toBe(false);
  });
  it("shows industry questions before the generic ones in the operations stage", () => {
    const stage2 = buildQuestionSet(by("real-estate").questions).filter((q) => q.stage === 2);
    expect(stage2[0].key.startsWith("re_")).toBe(true);
  });
  it("supports conditional questions", () => {
    const q = by("real-estate").questions.find((x) => x.key === "re_bottleneck_other")!;
    expect(isVisible(q, { re_bottleneck: "other" })).toBe(true);
    expect(isVisible(q, { re_bottleneck: "scheduling_viewings" })).toBe(false);
    const other = UNIVERSAL_QUESTIONS.find((x) => x.key === "challengeOther")!;
    expect(isVisible(other, { challenges: ["MANUAL_WORK", "OTHER"] })).toBe(true);
    expect(isVisible(other, { challenges: ["MANUAL_WORK"] })).toBe(false);
  });
});
