/** @jest-environment node */
const state: { proposal: Record<string, unknown>; version: Record<string, unknown> } = { proposal: {}, version: {} };
const enqueueJob = jest.fn(async () => ({ created: true }));
jest.mock("@/lib/ai-automation/jobs", () => ({ enqueueJob: (...a: unknown[]) => (enqueueJob as unknown as (...x: unknown[]) => unknown)(...a) }));
jest.mock("@/lib/ai-automation/crm", () => ({ logActivity: jest.fn(async () => undefined), advanceLead: jest.fn(async () => true), setLeadStatus: jest.fn(async () => undefined) }));
jest.mock("@/lib/ai-automation/proposal/content", () => ({ ...jest.requireActual("@/lib/ai-automation/proposal/content"), renderProposalPdf: jest.fn(() => Buffer.from("%PDF-test")) }));
jest.mock("@/lib/ai-automation/integrations/provider", () => ({ createImplementationProject: jest.fn(async () => ({ id: 1 })) }));

const db = {
  aiProposal: { findUniqueOrThrow: jest.fn(async () => state.proposal), findUnique: jest.fn(async () => state.proposal), update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => Object.assign(state.proposal, data)), findMany: jest.fn(async () => []) },
  aiProposalVersion: { findFirstOrThrow: jest.fn(async () => state.version), findFirst: jest.fn(async () => state.version), create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => data), updateMany: jest.fn(async () => ({ count: 1 })) },
  aiProposalItem: { deleteMany: jest.fn(), createMany: jest.fn() },
  aiPricingCalculation: { create: jest.fn() },
  aiLead: { update: jest.fn() },
  $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops)),
};
jest.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: (_t, k: string) => (db as Record<string, unknown>)[k] }) }));

import { approveProposal, editProposal, queueSend, rejectProposal, recordOutcome, isFinalStatus } from "@/lib/ai-automation/proposal/service";

const quote = (status: "COMPLETE" | "MANUAL_REVIEW", approval = { required: false, reasons: [] as string[] }) => ({ status, currency: "USD", initialTotal: status === "COMPLETE" ? 1000 : null, monthlyTotal: 100, lines: [], missing: status === "COMPLETE" ? [] : ["no price"], notes: [], approval, paymentSchedule: [] });
const setup = (status: string, q = quote("COMPLETE"), extra: Record<string, unknown> = {}) => {
  state.proposal = { id: 4, ref: "RS-AI-2026-000004", assessmentId: 2, leadId: 8, status, currentVersion: 2, validUntil: new Date(Date.now() + 86_400_000), lead: { anonymisedAt: null }, ...extra };
  state.version = { proposalId: 4, version: 2, content: { quote: q, quoteInput: { items: [{ key: "ai-whatsapp-agent" }], options: {} }, solutions: [], integrations: [], deliverables: [] } };
};
beforeEach(() => jest.clearAllMocks());

describe("proposal approval workflow", () => {
  it("approves an approved-pricing proposal that is awaiting approval and re-renders the issued PDF", async () => {
    setup("AWAITING_APPROVAL");
    await approveProposal(4, "vera@ravesoft.com", "SALES");
    expect(state.proposal).toMatchObject({ status: "APPROVED", approvedBy: "vera@ravesoft.com" });
    expect(db.aiProposalVersion.updateMany).toHaveBeenCalled(); // issued (non-draft) PDF stored
  });
  it("refuses to approve a proposal with incomplete pricing", async () => {
    setup("AWAITING_APPROVAL", quote("MANUAL_REVIEW"));
    await expect(approveProposal(4, "a", "CEO")).rejects.toThrow(/incomplete pricing/);
    expect(state.proposal.status).toBe("AWAITING_APPROVAL");
  });
  it("refuses to approve a proposal in the wrong state", async () => {
    for (const s of ["MANUAL_REVIEW", "DRAFT", "SENT", "APPROVED", "REJECTED"]) { setup(s); await expect(approveProposal(4, "a", "CEO")).rejects.toThrow(/awaiting approval/); }
  });
  it("needs manager-level approval for exceptions (discount/total/margin)", async () => {
    setup("AWAITING_APPROVAL", quote("COMPLETE", { required: true, reasons: ["Discount 20% exceeds the authorised 10%."] }));
    await expect(approveProposal(4, "sales@x", "SALES")).rejects.toThrow(/manager-level approval/);
    await approveProposal(4, "mgr@x", "MANAGER");
    expect(state.proposal.status).toBe("APPROVED");
  });
  it("rejects a proposal with a reason and clears any approval", async () => {
    setup("AWAITING_APPROVAL", quote("COMPLETE"), { approvedBy: "x" });
    await rejectProposal(4, "mgr", "Wrong scope");
    expect(state.proposal).toMatchObject({ status: "REJECTED", rejectedReason: "Wrong scope", approvedBy: null });
  });
  it("will not reject a closed proposal", async () => { setup("ACCEPTED"); await expect(rejectProposal(4, "m", "x")).rejects.toThrow(/closed/); });
});

describe("sending", () => {
  it("only approved proposals can be queued for sending", async () => {
    for (const s of ["AWAITING_APPROVAL", "MANUAL_REVIEW", "REJECTED", "DRAFT"]) { setup(s); await expect(queueSend(4, "a")).rejects.toThrow(/Only approved/); }
    expect(enqueueJob).not.toHaveBeenCalled();
    setup("APPROVED");
    await queueSend(4, "a");
    expect(enqueueJob).toHaveBeenCalledWith(expect.objectContaining({ type: "EMAIL", key: "email:proposal:4:v2", payload: { kind: "customer_proposal", proposalId: 4 } }));
  });
  it("blocks sending expired proposals and erased customers; resend needs a SENT proposal", async () => {
    setup("APPROVED", quote("COMPLETE"), { validUntil: new Date(Date.now() - 1000) });
    await expect(queueSend(4, "a")).rejects.toThrow(/expired/);
    setup("APPROVED", quote("COMPLETE"), { lead: { anonymisedAt: new Date() } });
    await expect(queueSend(4, "a")).rejects.toThrow(/removed/);
    setup("APPROVED"); await expect(queueSend(4, "a", { resend: true })).resolves.toBeUndefined();
    setup("AWAITING_APPROVAL"); await expect(queueSend(4, "a", { resend: true })).rejects.toThrow();
  });
  it("treats only approved/sent/accepted as customer-visible final statuses", () => {
    expect(["APPROVED", "SENT", "ACCEPTED"].every(isFinalStatus)).toBe(true);
    expect(["DRAFT", "MANUAL_REVIEW", "AWAITING_APPROVAL", "REJECTED", "DECLINED"].some(isFinalStatus)).toBe(false);
  });
});

describe("editing & versions", () => {
  const items = { items: [{ key: "ai-whatsapp-agent" }], options: { currency: "USD" as const } };
  it("creates a NEW version on every edit, bumps the pointer and clears a previous approval", async () => {
    setup("APPROVED", quote("COMPLETE"), { approvedBy: "mgr", approvedAt: new Date() });
    const r = await editProposal(4, { sections: { executiveSummary: "Better summary" }, note: "Reworded", actor: "sales", role: "SALES" });
    expect(r.version).toBe(3);
    expect(db.aiProposalVersion.create).toHaveBeenCalledWith({ data: expect.objectContaining({ proposalId: 4, version: 3, changeNote: "Reworded", createdBy: "sales" }) });
    expect(state.proposal).toMatchObject({ currentVersion: 3, approvedBy: null, approvedAt: null });
    expect(r.status).toBe("AWAITING_APPROVAL");
    expect(enqueueJob).toHaveBeenCalledWith(expect.objectContaining({ type: "PDF", key: "pdf:4:v3" }));
  });
  it("recalculates pricing through the engine; with no approved prices the edit lands in MANUAL_REVIEW", async () => {
    setup("AWAITING_APPROVAL");
    const r = await editProposal(4, { quoteInput: items, actor: "sales", role: "SALES" });
    expect(r.status).toBe("MANUAL_REVIEW");
    expect(db.aiPricingCalculation.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "MANUAL_REVIEW", proposalId: 4 }) });
  });
  it("only finance-level roles can override approved prices", async () => {
    setup("AWAITING_APPROVAL");
    await expect(editProposal(4, { quoteInput: { items: items.items, options: { priceOverrides: { "ai-whatsapp-agent": 1 } } }, actor: "s", role: "SALES" })).rejects.toThrow(/finance, manager or executive/);
    await expect(editProposal(4, { quoteInput: { items: items.items, options: { priceOverrides: { "ai-whatsapp-agent": 1 } } }, actor: "f", role: "FINANCE" })).resolves.toBeTruthy();
  });
  it("cannot edit accepted or declined proposals; rejects bad wording", async () => {
    setup("ACCEPTED"); await expect(editProposal(4, { sections: { executiveSummary: "x" }, actor: "a", role: "CEO" })).rejects.toThrow(/cannot be edited/);
    setup("DECLINED"); await expect(editProposal(4, { sections: { executiveSummary: "x" }, actor: "a", role: "CEO" })).rejects.toThrow(/cannot be edited/);
    setup("AWAITING_APPROVAL"); await expect(editProposal(4, { sections: { executiveSummary: "" }, actor: "a", role: "CEO" })).rejects.toThrow();
  });
});

describe("outcomes", () => {
  it("only sent/approved proposals can be accepted; acceptance stops follow-ups", async () => {
    setup("AWAITING_APPROVAL"); await expect(recordOutcome(4, "ACCEPTED", "a")).rejects.toThrow(/sent or approved/);
    setup("SENT"); await recordOutcome(4, "ACCEPTED", "a");
    expect(state.proposal.status).toBe("ACCEPTED");
    expect(db.aiLead.update).toHaveBeenCalledWith({ where: { id: 8 }, data: { followupsStopped: true } });
  });
  it("declining marks the proposal declined", async () => { setup("SENT"); await recordOutcome(4, "DECLINED", "a", { reason: "Too expensive" }); expect(state.proposal.status).toBe("DECLINED"); });
});
