/* eslint-disable @typescript-eslint/no-explicit-any */
/** @jest-environment node */
process.env.GROWTH_POSTAL_ADDRESS = "1 Main St, Austin TX";
process.env.GROWTH_SENDER_IDENTITY = "RaveSoft";
process.env.GROWTH_ENGINE_ENABLED = "true";

const db: any = {
  grOutbox: { findUniqueOrThrow: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  grDraft: { findUniqueOrThrow: jest.fn(), findFirst: jest.fn() },
  grApproval: { findUniqueOrThrow: jest.fn() },
  grCompany: { findUniqueOrThrow: jest.fn() },
  grContact: { findUniqueOrThrow: jest.fn() },
  grSuppression: { findFirst: jest.fn() },
  grReply: { count: jest.fn() },
  osOptOut: { findFirst: jest.fn() },
  osActivity: { count: jest.fn() },
  osOpportunity: { findUnique: jest.fn() },
  osOutreach: { create: jest.fn() },
  systemSetting: { findUnique: jest.fn() },
};
jest.mock("@/lib/prisma", () => ({ prisma: db }));
jest.mock("@/lib/os/audit", () => ({ audit: jest.fn() }));
jest.mock("@/lib/os/crm", () => ({ logActivity: jest.fn(), setStage: jest.fn() }));
jest.mock("@/lib/os/outreach", () => ({ isOutboundPaused: jest.fn().mockResolvedValue(false) }));
const send = jest.fn();
jest.mock("@/lib/os/channels", () => ({ getChannelAdapter: () => ({ send, status: () => ({ connected: true }) }) }));

import { checkGates, dispatchDue } from "@/lib/growth/outbox";
import { contentHash, checkPolicy } from "@/lib/growth/policy";

const body = `Hello,\n\nHow quickly do after-hours enquiries get a reply?\n\nRaveSoft\n1 Main St, Austin TX\n\nReply "unsubscribe" and we will stop.`;
const base = { toEmail: "o@acme.com", senderIdentity: "RaveSoft", subject: "Enquiry handling", body };
const hash = contentHash(base);

function arrange(over: { draft?: any; approval?: any; company?: any; contact?: any; ob?: any } = {}) {
  db.grOutbox.findUniqueOrThrow.mockResolvedValue({ id: 1, draftId: 2, approvalId: 3, companyId: 4, toEmail: "o@acme.com", attempts: 0, ...over.ob });
  const draft = { id: 2, companyId: 4, contactId: 5, sequenceKey: "default", touch: 1, version: 1, status: "APPROVED", ...base, model: "t", ...over.draft };
  db.grDraft.findUniqueOrThrow.mockResolvedValue(draft);
  db.grDraft.findFirst.mockResolvedValue(draft);
  db.grApproval.findUniqueOrThrow.mockResolvedValue({ id: 3, status: "ACTIVE", contentHash: hash, toEmail: "o@acme.com", expiresAt: new Date(Date.now() + 3600_000), ...over.approval });
  db.grCompany.findUniqueOrThrow.mockResolvedValue({ id: 4, domain: "acme.com", outreachDisabled: false, opportunityId: 9, ...over.company });
  db.grContact.findUniqueOrThrow.mockResolvedValue({ id: 5, status: "VERIFIED", ...over.contact });
}

beforeEach(() => {
  jest.clearAllMocks();
  arrange();
  db.grSuppression.findFirst.mockResolvedValue(null);
  db.osOptOut.findFirst.mockResolvedValue(null);
  db.grReply.count.mockResolvedValue(0);
  db.osActivity.count.mockResolvedValue(0);
  db.osOpportunity.findUnique.mockResolvedValue({ stage: "RESEARCHED" });
  db.systemSetting.findUnique.mockImplementation(async ({ where }: any) => (where.key.includes("inbox_last_poll") ? { value: new Date().toISOString() } : null));
  db.grOutbox.findMany.mockResolvedValue([]);
  db.grOutbox.findFirst.mockResolvedValue(null);
});

describe("checkGates", () => {
  it("passes when everything is valid", async () => { expect(checkPolicy({ ...base, postalAddress: "1 Main St, Austin TX", touch: 1 }).passed).toBe(true); expect(await checkGates(1)).toEqual({ ok: true }); });
  it("cancels when body was edited after approval (hash mismatch)", async () => {
    arrange({ draft: { body: body + " edited" } });
    expect(await checkGates(1)).toMatchObject({ ok: false, action: "CANCEL", reason: expect.stringMatching(/changed/) });
  });
  it("cancels when a newer version exists", async () => {
    db.grDraft.findFirst.mockResolvedValue({ id: 99 });
    expect(await checkGates(1)).toMatchObject({ action: "CANCEL", reason: expect.stringMatching(/newer/) });
  });
  it("cancels on invalidated or expired approval", async () => {
    arrange({ approval: { status: "INVALIDATED" } });
    expect((await checkGates(1)) as any).toMatchObject({ action: "CANCEL" });
    arrange({ approval: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await checkGates(1)) as any).toMatchObject({ action: "CANCEL", reason: expect.stringMatching(/expired/) });
  });
  it("cancels for suppressed, opted-out or unverified recipients", async () => {
    db.grSuppression.findFirst.mockResolvedValue({ kind: "DOMAIN", reason: "asked" });
    expect((await checkGates(1)) as any).toMatchObject({ action: "CANCEL" });
    db.grSuppression.findFirst.mockResolvedValue(null);
    db.osOptOut.findFirst.mockResolvedValue({ id: 1 });
    expect((await checkGates(1)) as any).toMatchObject({ action: "CANCEL" });
    db.osOptOut.findFirst.mockResolvedValue(null);
    arrange({ contact: { status: "RISKY" } });
    expect((await checkGates(1)) as any).toMatchObject({ action: "CANCEL", reason: expect.stringMatching(/RISKY/) });
  });
  it("cancels after a real reply but not after out-of-office only", async () => {
    db.grReply.count.mockResolvedValue(1);
    expect((await checkGates(1)) as any).toMatchObject({ action: "CANCEL" });
    expect(db.grReply.count.mock.calls[0][0].where.category).toEqual({ not: "OUT_OF_OFFICE" });
  });
  it("defers (does not assume no reply) when the mailbox is stale or unprocessed replies exist", async () => {
    db.systemSetting.findUnique.mockResolvedValue(null);
    expect((await checkGates(1)) as any).toMatchObject({ action: "DEFER", reason: expect.stringMatching(/unknown/) });
    db.systemSetting.findUnique.mockImplementation(async ({ where }: any) => (where.key.includes("inbox_last_poll") ? { value: new Date().toISOString() } : null));
    db.osActivity.count.mockResolvedValue(2);
    db.grReply.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    expect((await checkGates(1)) as any).toMatchObject({ action: "DEFER", reason: expect.stringMatching(/Unprocessed/) });
  });
  it("defers a follow-up until the previous touch was sent and the interval passed", async () => {
    arrange({ draft: { touch: 2 } });
    expect((await checkGates(1)) as any).toMatchObject({ action: "DEFER", reason: expect.stringMatching(/Previous touch/) });
    db.grOutbox.findFirst.mockResolvedValue({ sentAt: new Date() });
    expect((await checkGates(1)) as any).toMatchObject({ action: "DEFER", reason: expect.stringMatching(/interval/) });
  });
  it("stops follow-ups once the deal is engaged", async () => {
    arrange({ draft: { touch: 2 } });
    db.grOutbox.findFirst.mockResolvedValue({ sentAt: new Date(Date.now() - 30 * 86400_000) });
    db.osOpportunity.findUnique.mockResolvedValue({ stage: "ENGAGED" });
    expect((await checkGates(1)) as any).toMatchObject({ action: "CANCEL" });
  });
  it("enforces daily, per-domain and gap limits", async () => {
    db.grOutbox.findMany.mockResolvedValue(Array.from({ length: 25 }, (_, i) => ({ toEmail: `x${i}@o.com`, sentAt: new Date(Date.now() - 2 * 3600_000) })));
    expect((await checkGates(1)) as any).toMatchObject({ action: "DEFER", reason: expect.stringMatching(/Daily/) });
    db.grOutbox.findMany.mockResolvedValue([{ toEmail: "y@acme.com", sentAt: new Date(Date.now() - 2 * 3600_000) }]);
    expect((await checkGates(1)) as any).toMatchObject({ action: "DEFER", reason: expect.stringMatching(/domain/) });
  });
});

describe("dispatchDue", () => {
  beforeEach(() => db.grOutbox.findMany.mockImplementation(async (a: any) => (a?.where?.status === "SCHEDULED" ? [{ id: 1, draftId: 2, companyId: 4, attempts: 0 }] : [])));
  it("sends once, with Message-ID stored before sending", async () => {
    db.grDraft.findUniqueOrThrow.mockResolvedValue({ id: 2, companyId: 4, touch: 1, version: 1, status: "APPROVED", ...base, sequenceKey: "default", model: "t", company: { opportunityId: null } });
    send.mockResolvedValue({ ok: true, providerRef: "<m@x>" });
    const r = await dispatchDue(5);
    expect(r.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
    const calls = db.grOutbox.update.mock.calls.map((c: any) => c[0].data);
    expect(calls.findIndex((d: any) => d.providerRef)).toBeLessThan(calls.findIndex((d: any) => d.status === "SENT"));
  });
  it("does not send when another worker already claimed the row", async () => {
    db.grOutbox.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await dispatchDue(5)).sent).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
  it("never sends a gated message and cancels it", async () => {
    db.grSuppression.findFirst.mockResolvedValue({ kind: "EMAIL", reason: "x" });
    const r = await dispatchDue(5);
    expect(r.cancelled).toBe(1);
    expect(send).not.toHaveBeenCalled();
  });
  it("retries provider failures without marking SENT", async () => {
    db.grDraft.findUniqueOrThrow.mockResolvedValue({ id: 2, companyId: 4, touch: 1, version: 1, status: "APPROVED", ...base, sequenceKey: "default", model: "t", company: { opportunityId: null } });
    send.mockResolvedValue({ ok: false, error: "smtp down" });
    const r = await dispatchDue(5);
    expect(r.failed).toBe(1);
    expect(db.grOutbox.update.mock.calls.some((c: any) => c[0].data.status === "SENT")).toBe(false);
  });
});
