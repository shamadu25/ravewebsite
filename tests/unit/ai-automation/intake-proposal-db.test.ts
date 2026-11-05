/** @jest-environment node */
const guardForm = jest.fn();
const enqueueJob = jest.fn(async () => ({ created: true }));
jest.mock("@/lib/antispam/guard", () => ({ guardForm: (...a: unknown[]) => guardForm(...a), POLICIES: { aiAssessment: {} } }));
jest.mock("@/lib/ai-automation/seed", () => ({ ensureSeeded: jest.fn(async () => undefined), seedAiAutomation: jest.fn() }));
jest.mock("@/lib/ai-automation/jobs", () => ({ enqueueJob: (...a: unknown[]) => (enqueueJob as unknown as (...x: unknown[]) => unknown)(...a) }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: Record<string, any> = {
  aiAssessment: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 77, ...data })) },
  aiIndustry: { findUnique: jest.fn(async () => ({ id: 3 })) },
  aiAssessmentResponse: { createMany: jest.fn(async () => ({ count: 1 })) },
  aiActivityLog: { create: jest.fn(async () => ({})) },
  company: { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 5, ...data })) },
  contact: { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 9, ...data })), update: jest.fn(async () => ({ id: 9 })) },
  lead: { create: jest.fn(async () => ({ id: 11 })) },
  aiLead: { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 21, ...data })), update: jest.fn(async ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => ({ id: where.id, ...data })) },
  $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
};
jest.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_t, k: string) => (db as Record<string, unknown>)[k] }) }));

import { submitAssessment, DEDUPE_WINDOW_MS } from "@/lib/ai-automation/intake";

const answers = () => ({
  businessName: "Acme Properties", country: "Ghana", city: "Accra", employees: "6_20", branches: "1", businessAge: "4_10_years", description: "We sell homes.",
  re_portfolio: "11_50", re_enquiries: "50_200", re_channels: ["whatsapp"], re_reps: "4_10", re_enquiry_handling: "whatsapp_chats_only", re_bottleneck: "responding_fast_enough",
  departments: ["sales"], productsServices: "Apartments", commChannels: ["whatsapp"], challenges: ["LOST_SALES"], automationAreas: ["AI_WHATSAPP"], outcomes: "More viewings", improvements: ["more_sales"], urgency: "immediately", timeline: "1_3_months",
  fullName: "Ama Mensah", position: "Director", email: "ama@acme.com", phone: "+233 24 000 0000", preferredChannel: "whatsapp", consentProcessing: true, consentMarketing: true,
});
const body = (over: Record<string, unknown> = {}) => ({ industry: "real-estate", answers: answers(), idempotencyKey: "abcdef0123456789abcdef", ...over });
const ip = { ip: "1.2.3.4" };

beforeEach(() => { jest.clearAllMocks(); guardForm.mockResolvedValue({ ok: true }); db.aiAssessment.findUnique.mockResolvedValue(null); db.aiAssessment.findFirst.mockResolvedValue(null); db.aiLead.findFirst.mockResolvedValue(null); db.contact.findFirst.mockResolvedValue(null); });

describe("assessment submission & persistence", () => {
  it("persists company, contact, CRM lead, AI lead, assessment and every answer in ONE transaction, then queues analysis", async () => {
    const r = await submitAssessment(body(), ip);
    expect(r).toMatchObject({ ok: true, duplicate: false });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.company.create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: "Acme Properties", country: "Ghana" }) });
    expect(db.contact.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: "ama@acme.com", firstName: "Ama", lastName: "Mensah", consentEmail: true }) });
    expect(db.lead.create).toHaveBeenCalledWith({ data: expect.objectContaining({ source: "ai_automation_assessment" }) }); // visible in the existing CRM
    expect(db.aiLead.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "ASSESSMENT_COMPLETED", industrySlug: "real-estate" }) });
    const a = (db.aiAssessment.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(a).toMatchObject({ industrySlug: "real-estate", businessName: "Acme Properties", idempotencyKey: "abcdef0123456789abcdef", consent: expect.objectContaining({ processing: true, marketing: true }) });
    expect(String(a.publicRef)).toMatch(/^AIA-[0-9A-F]{10}$/);
    const rows = (db.aiAssessmentResponse.createMany.mock.calls[0] as unknown as [{ data: Array<{ questionKey: string }> }])[0].data;
    expect(rows.map((x) => x.questionKey)).toEqual(expect.arrayContaining(["re_portfolio", "challenges", "email"]));
    expect(enqueueJob).toHaveBeenCalledWith(expect.objectContaining({ type: "ANALYSIS", key: "analysis:77:initial" }));
  });
  it("rejects invalid answers with field errors and the stage to return to — and stores nothing", async () => {
    const r = await submitAssessment(body({ answers: { ...answers(), email: "nope", re_portfolio: "" } }), ip);
    expect(r).toMatchObject({ ok: false, status: 422, fieldErrors: expect.objectContaining({ email: expect.any(String), re_portfolio: expect.any(String) }), stage: 2 });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(guardForm).not.toHaveBeenCalled();
  });
  it("requires processing consent", async () => {
    const r = await submitAssessment(body({ answers: { ...answers(), consentProcessing: false } }), ip);
    expect(r).toMatchObject({ ok: false, status: 422 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("rejects unknown industries and malformed requests", async () => {
    expect(await submitAssessment(body({ industry: "underwater-basket-weaving" }), ip)).toMatchObject({ ok: false, status: 422 });
    expect(await submitAssessment({ industry: "x" }, ip)).toMatchObject({ ok: false, status: 422 });
    expect(await submitAssessment(body({ idempotencyKey: "short" }), ip)).toMatchObject({ ok: false, status: 422 });
  });
  it("prevents duplicate submissions: same idempotency key returns the original reference", async () => {
    db.aiAssessment.findUnique.mockResolvedValue({ publicRef: "AIA-EXISTING01" });
    const r = await submitAssessment(body(), ip);
    expect(r).toEqual({ ok: true, publicRef: "AIA-EXISTING01", duplicate: true });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(enqueueJob).not.toHaveBeenCalled();
  });
  it("prevents duplicate customers: the same business + email within 24h is the same submission", async () => {
    db.aiAssessment.findFirst.mockResolvedValue({ publicRef: "AIA-RECENT0001" });
    const r = await submitAssessment(body({ idempotencyKey: "different0123456789key" }), ip);
    expect(r).toMatchObject({ ok: true, duplicate: true, publicRef: "AIA-RECENT0001" });
    const where = (db.aiAssessment.findFirst.mock.calls[0] as unknown as [{ where: { submittedAt: { gt: Date }; lead: { contact: { email: string } } } }])[0].where;
    expect(where.lead.contact.email).toBe("ama@acme.com");
    expect(Date.now() - where.submittedAt.gt.getTime()).toBeLessThanOrEqual(DEDUPE_WINDOW_MS + 1000);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("reuses the existing open AI lead for a returning contact instead of creating a duplicate customer record", async () => {
    db.contact.findFirst.mockResolvedValue({ id: 9, consentEmail: false } as never);
    db.aiLead.findFirst.mockResolvedValue({ id: 21, status: "QUALIFIED" } as never);
    await submitAssessment(body(), ip);
    expect(db.contact.update).toHaveBeenCalled();
    expect(db.contact.create).not.toHaveBeenCalled();
    expect(db.aiLead.create).not.toHaveBeenCalled();
    expect(db.aiLead.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 21 }, data: expect.objectContaining({ status: "QUALIFIED" }) })); // does not regress status
  });
  it("gives bots a plausible success without storing anything (honeypot)", async () => {
    guardForm.mockResolvedValue({ ok: false, status: 200, error: "", reason: "honeypot", silent: true });
    const r = await submitAssessment(body({ hp: "i am a bot" }), ip);
    expect(r).toMatchObject({ ok: true, silent: true });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(enqueueJob).not.toHaveBeenCalled();
  });
  it("surfaces rate limits and spam blocks", async () => {
    guardForm.mockResolvedValue({ ok: false, status: 429, error: "Too many requests.", reason: "ip_rate" });
    expect(await submitAssessment(body(), ip)).toMatchObject({ ok: false, status: 429 });
    guardForm.mockResolvedValue({ ok: false, status: 422, error: "Please remove any links", reason: "content:links" });
    expect(await submitAssessment(body(), ip)).toMatchObject({ ok: false, status: 422 });
  });
  it("passes the guard the contact details and free text it needs for spam checks", async () => {
    await submitAssessment(body(), { ip: "9.9.9.9" });
    expect(guardForm).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ ip: "9.9.9.9", email: "ama@acme.com", company: "Acme Properties", honeypot: "" }));
  });
  it("strips markup from stored answers", async () => {
    await submitAssessment(body({ answers: { ...answers(), description: "<img src=x onerror=alert(1)>We sell homes" } }), ip);
    const rows = (db.aiAssessmentResponse.createMany.mock.calls[0] as unknown as [{ data: Array<{ questionKey: string; value: unknown }> }])[0].data;
    expect(rows.find((r) => r.questionKey === "description")!.value).toBe("We sell homes");
  });
});
