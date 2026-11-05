/** @jest-environment node */
import { PIPELINE_RANK, shouldAdvance, validateManualTransition } from "@/lib/ai-automation/crm";
import { PIPELINE_STATUSES } from "@/lib/ai-automation/types";
import { kovabotProvider, manualProvider, selectProvider, type DeploymentProvider } from "@/lib/ai-automation/integrations/provider";
import { can, meetsRole, type Role } from "@/lib/os/rbac";
import { parseEvent } from "@/lib/ai-automation/events";
import { backoffMs } from "@/lib/ai-automation/jobs";

describe("CRM pipeline", () => {
  it("defines the pipeline in the specified order", () => {
    expect([...PIPELINE_STATUSES]).toEqual(["NEW_LEAD", "ASSESSMENT_COMPLETED", "AI_ANALYSIS_COMPLETED", "QUALIFIED", "PROPOSAL_GENERATED", "AWAITING_APPROVAL", "PROPOSAL_SENT", "NEGOTIATION", "ACCEPTED", "IMPLEMENTATION", "ACTIVE_CUSTOMER", "COMPLETED", "LOST"]);
    expect(PIPELINE_RANK.QUALIFIED).toBeLessThan(PIPELINE_RANK.PROPOSAL_SENT);
  });
  it("only advances automatically, never backwards, and never revives closed leads", () => {
    expect(shouldAdvance("NEW_LEAD", "QUALIFIED")).toBe(true);
    expect(shouldAdvance("PROPOSAL_SENT", "QUALIFIED")).toBe(false);
    expect(shouldAdvance("QUALIFIED", "QUALIFIED")).toBe(false);
    expect(shouldAdvance("LOST", "QUALIFIED")).toBe(false);
    expect(shouldAdvance("COMPLETED", "PROPOSAL_SENT")).toBe(false);
    expect(shouldAdvance("QUALIFIED", "LOST")).toBe(false); // LOST is a deliberate manual decision
  });
  it("validates manual transitions: known status, and a reason when lost", () => {
    expect(validateManualTransition("NEGOTIATION")).toEqual({ ok: true });
    expect(validateManualTransition("BOGUS")).toMatchObject({ ok: false });
    expect(validateManualTransition("LOST", "")).toMatchObject({ ok: false, error: expect.stringMatching(/lost reason/i) });
    expect(validateManualTransition("LOST", "Chose a competitor")).toEqual({ ok: true });
  });
});

describe("Kovabot integration abstraction", () => {
  const OLD = { ...process.env };
  afterEach(() => { process.env = { ...OLD }; });
  it("Kovabot is never available until its API contract is verified, even with credentials set", async () => {
    process.env.KOVABOT_API_URL = "https://kovabot.example"; process.env.KOVABOT_API_KEY = "k"; process.env.KOVABOT_CONTRACT_VERIFIED = "true";
    expect(kovabotProvider.isAvailable()).toBe(false);
    const res = await kovabotProvider.provision({ projectId: 1, proposalRef: "R", customer: { businessName: "B", contactEmail: "a@b.c" }, agents: [], integrations: [] });
    expect(res).toMatchObject({ ok: false, status: "NOT_CONFIGURED" });
    expect("externalRef" in res).toBe(false); // no fake deployment
  });
  it("falls back to the manual hand-off provider and never fabricates a deployment", async () => {
    expect(selectProvider().id).toBe("manual");
    const res = await manualProvider.provision({ projectId: 1, proposalRef: "R", customer: { businessName: "B", contactEmail: "a@b.c" }, agents: [], integrations: [] });
    expect(res.ok).toBe(false);
  });
  it("lets another provider be plugged in without touching the platform", async () => {
    const fake: DeploymentProvider = { id: "fake", isAvailable: () => true, provision: async () => ({ ok: true, externalRef: "ext-1", status: "PROVISIONING" }) };
    expect(selectProvider([fake, manualProvider]).id).toBe("fake");
    const unavailable: DeploymentProvider = { ...fake, isAvailable: () => false };
    expect(selectProvider([unavailable, manualProvider]).id).toBe("manual");
  });
});

describe("role permissions", () => {
  const roles: Role[] = ["SUPER_ADMIN", "CEO", "EXECUTIVE", "MANAGER", "SALES", "MARKETING", "SUPPORT", "ENGINEERING", "FINANCE", "VIEWER"];
  it("grants read to everyone and write/approve/pricing/settings by role", () => {
    for (const r of roles) expect(can(r, "ai.read")).toBe(true);
    expect(can("SALES", "ai.write")).toBe(true);
    expect(can("SALES", "ai.approve")).toBe(false);
    expect(can("SALES", "ai.pricing")).toBe(false);
    expect(can("MANAGER", "ai.approve")).toBe(true);
    expect(can("MANAGER", "ai.pricing")).toBe(false);
    expect(can("FINANCE", "ai.pricing")).toBe(true);
    expect(can("FINANCE", "ai.approve")).toBe(false);
    expect(can("VIEWER", "ai.write")).toBe(false);
    expect(can("SUPPORT", "ai.settings")).toBe(false);
    expect(can("EXECUTIVE", "ai.settings")).toBe(false);
    expect(can("SUPER_ADMIN", "ai.settings")).toBe(true);
    expect(can("CEO", "ai.settings")).toBe(true);
  });
  it("ranks approvers: managers can approve exceptions, sales cannot", () => {
    expect(meetsRole("MANAGER", "MANAGER")).toBe(true);
    expect(meetsRole("SALES", "MANAGER")).toBe(false);
  });
});

describe("analytics events and job backoff", () => {
  it("whitelists event names and sanitises fields; stores no PII", () => {
    expect(parseEvent({ name: "assessment_start", industry: "retail", session: "abc12345xyz", step: 2 })).toEqual({ name: "assessment_start", industrySlug: "retail", sessionId: "abc12345xyz", step: 2 });
    expect(parseEvent({ name: "drop_table" })).toBeNull();
    expect(parseEvent({ name: "page_view", industry: "../etc", session: "x", step: 99, email: "a@b.c" })).toEqual({ name: "page_view", industrySlug: null, sessionId: null, step: null });
    expect(parseEvent(null)).toBeNull();
  });
  it("backs off exponentially and caps", () => {
    expect([1, 2, 3, 4].map(backoffMs)).toEqual([30_000, 120_000, 480_000, 1_920_000]);
    expect(backoffMs(20)).toBe(6 * 3_600_000);
  });
});
