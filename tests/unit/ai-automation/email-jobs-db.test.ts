/** @jest-environment node */
type Row = Record<string, unknown> & { id: number };

const match = (row: Row, where: Record<string, unknown> = {}): boolean =>
  Object.entries(where).every(([k, v]) => {
    const x = row[k];
    if (v && typeof v === "object" && !(v instanceof Date)) {
      const c = v as Record<string, unknown>;
      if ("lt" in c) return (x as Date) < (c.lt as Date);
      if ("lte" in c) return (x as Date) <= (c.lte as Date);
      if ("in" in c) return (c.in as unknown[]).includes(x);
      return true;
    }
    return x === v;
  });

function table(unique: string[] = []) {
  const rows: Row[] = [];
  let id = 0;
  const dup = (d: Record<string, unknown>) => unique.some((u) => rows.some((r) => r[u] === d[u]));
  return {
    rows,
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => { if (dup(data)) throw Object.assign(new Error("Unique"), { code: "P2002" }); const r = { id: ++id, attempts: 0, status: "QUEUED", createdAt: new Date(), ...data } as Row; rows.push(r); return r; }),
    findUnique: jest.fn(async ({ where }: { where: Record<string, unknown> }) => rows.find((r) => match(r, where)) ?? null),
    findUniqueOrThrow: jest.fn(async ({ where }: { where: Record<string, unknown> }) => { const r = rows.find((x) => match(x, where)); if (!r) throw new Error("not found"); return r; }),
    findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => rows.find((r) => match(r, where)) ?? null),
    findMany: jest.fn(async ({ where, take }: { where?: Record<string, unknown>; take?: number } = {}) => rows.filter((r) => match(r, where)).slice(0, take).map((r) => ({ ...r }))), // detached copies, like a real ORM
    update: jest.fn(async ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => { const r = rows.find((x) => x.id === where.id)!; for (const [k, v] of Object.entries(data)) { if (v && typeof v === "object" && "increment" in (v as object)) r[k] = (r[k] as number) + (v as { increment: number }).increment; else if (v !== undefined) r[k] = v; } return r; }),
    updateMany: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => { const hit = rows.filter((r) => match(r, where)); hit.forEach((r) => { for (const [k, v] of Object.entries(data)) { if (v && typeof v === "object" && "increment" in (v as object)) r[k] = (r[k] as number) + (v as { increment: number }).increment; else if (v !== undefined) r[k] = v; } }); return { count: hit.length }; }),
  };
}

const emailLog = table(["dedupeKey"]);
const job = table(["idempotencyKey"]);
jest.mock("@/lib/prisma", () => ({ prisma: { aiEmailLog: emailLog, aiJob: job } }));

import { sendEmail, recordDeliveryEvent } from "@/lib/ai-automation/email/send";
import { enqueueJob, runJobs, registerHandler, retryJob, setFailureHook } from "@/lib/ai-automation/jobs";

const msg = { subject: "Hello\r\nBcc: x@y.z", html: "<p>x</p>", text: "x" };
const reset = () => { emailLog.rows.length = 0; job.rows.length = 0; jest.clearAllMocks(); };

describe("email delivery", () => {
  beforeEach(reset);
  it("sends once and records ACCEPTED — not DELIVERED", async () => {
    const t = { sendMail: jest.fn(async () => ({ messageId: "<m1@x>" })) };
    const r = await sendEmail({ dedupeKey: "k1", kind: "customer_proposal", to: "a@b.co", email: msg, transport: t });
    expect(r.status).toBe("ACCEPTED");
    expect(emailLog.rows[0]).toMatchObject({ status: "ACCEPTED", providerMessageId: "<m1@x>", attempts: 1 });
    expect(emailLog.rows[0].deliveredAt).toBeUndefined();
    expect((t.sendMail.mock.calls[0] as unknown as [{ subject: string }])[0].subject).not.toMatch(/[\r\n]/);
  });
  it("prevents duplicate customer emails with the same dedupe key", async () => {
    const t = { sendMail: jest.fn(async () => ({ messageId: "<m>" })) };
    await sendEmail({ dedupeKey: "same", kind: "x", to: "a@b.co", email: msg, transport: t });
    const again = await sendEmail({ dedupeKey: "same", kind: "x", to: "a@b.co", email: msg, transport: t });
    expect(again.status).toBe("SKIPPED_DUPLICATE");
    expect(t.sendMail).toHaveBeenCalledTimes(1);
    expect(emailLog.rows).toHaveLength(1);
  });
  it("records failures, throws so the job retries, and a retry reuses the same log row", async () => {
    const fail = { sendMail: jest.fn(async () => { throw new Error("550 mailbox unavailable"); }) };
    await expect(sendEmail({ dedupeKey: "f1", kind: "x", to: "a@b.co", email: msg, transport: fail })).rejects.toThrow(/550/);
    expect(emailLog.rows[0]).toMatchObject({ status: "FAILED", attempts: 1 });
    expect(String(emailLog.rows[0].error)).toMatch(/550/);
    const ok = { sendMail: jest.fn(async () => ({ messageId: "<ok>" })) };
    expect((await sendEmail({ dedupeKey: "f1", kind: "x", to: "a@b.co", email: msg, transport: ok })).status).toBe("ACCEPTED");
    expect(emailLog.rows).toHaveLength(1);
    expect(emailLog.rows[0]).toMatchObject({ status: "ACCEPTED", attempts: 2, error: null });
  });
  it("fails clearly when SMTP is not configured", async () => {
    const saved = { ...process.env }; delete process.env.SMTP_HOST; delete process.env.SMTP_USER; delete process.env.SMTP_PASS;
    await expect(sendEmail({ dedupeKey: "nosmtp", kind: "x", to: "a@b.co", email: msg })).rejects.toThrow(/SMTP is not configured/);
    expect(emailLog.rows[0].status).toBe("FAILED");
    process.env = saved;
  });
  it("only a provider event can mark an email DELIVERED or BOUNCED", async () => {
    const t = { sendMail: jest.fn(async () => ({ messageId: "<evt>" })) };
    await sendEmail({ dedupeKey: "e1", kind: "x", to: "a@b.co", email: msg, transport: t });
    expect(emailLog.rows[0].status).toBe("ACCEPTED");
    expect(await recordDeliveryEvent("<unknown>", "delivered")).toBe(false);
    expect(await recordDeliveryEvent("<evt>", "delivered")).toBe(true);
    expect(emailLog.rows[0]).toMatchObject({ status: "DELIVERED" });
    expect(emailLog.rows[0].deliveredAt).toBeInstanceOf(Date);
    await recordDeliveryEvent("<evt>", "bounced");
    expect(emailLog.rows[0].status).toBe("BOUNCED");
  });
});

describe("background jobs", () => {
  beforeEach(reset);
  it("is idempotent: the same key never creates a second job", async () => {
    const a = await enqueueJob({ type: "ANALYSIS", key: "analysis:1:initial", payload: { assessmentId: 1 } });
    const b = await enqueueJob({ type: "ANALYSIS", key: "analysis:1:initial", payload: { assessmentId: 1 } });
    expect(a.created).toBe(true); expect(b.created).toBe(false);
    expect(job.rows).toHaveLength(1);
  });
  it("runs a job to completion exactly once", async () => {
    const h = jest.fn(async () => undefined); registerHandler("ANALYSIS", h);
    await enqueueJob({ type: "ANALYSIS", key: "ok", payload: { assessmentId: 5 } });
    const s = await runJobs({ budgetMs: 1000, types: ["ANALYSIS"] });
    expect(s).toMatchObject({ ran: 1, done: 1, failed: 0 });
    expect(h).toHaveBeenCalledWith({ assessmentId: 5 }, expect.objectContaining({ attempts: 1 }));
    expect((await runJobs({ budgetMs: 1000, types: ["ANALYSIS"] })).ran).toBe(0);
    expect(job.rows[0].status).toBe("DONE");
  });
  it("retries with backoff, records the error, then fails permanently and alerts", async () => {
    registerHandler("PDF", async () => { throw new Error("renderer crashed"); });
    const alerts: string[] = []; setFailureHook(async (j, e) => { alerts.push(`${j.type}:${e}`); });
    await enqueueJob({ type: "PDF", key: "pdf1", payload: {}, maxAttempts: 2 });
    let s = await runJobs({ budgetMs: 1000, types: ["PDF"] });
    expect(s.retried).toBe(1);
    expect(job.rows[0]).toMatchObject({ status: "QUEUED", attempts: 1, lastError: "renderer crashed" });
    expect((job.rows[0].runAfter as Date).getTime()).toBeGreaterThan(Date.now() + 20_000);
    expect((await runJobs({ budgetMs: 1000, types: ["PDF"] })).ran).toBe(0); // not due yet
    job.rows[0].runAfter = new Date(Date.now() - 1);
    s = await runJobs({ budgetMs: 1000, types: ["PDF"] });
    expect(s.failed).toBe(1);
    expect(job.rows[0].status).toBe("FAILED");
    expect(alerts).toEqual(["PDF:renderer crashed"]);
    setFailureHook(null);
  });
  it("lets an administrator retry only failed jobs", async () => {
    registerHandler("PDF", async () => undefined);
    await enqueueJob({ type: "PDF", key: "r1", payload: {}, maxAttempts: 1 });
    job.rows[0].status = "FAILED";
    await retryJob(job.rows[0].id);
    expect(job.rows[0]).toMatchObject({ status: "QUEUED", attempts: 0 });
    await expect(retryJob(job.rows[0].id)).rejects.toThrow(/Only failed jobs/);
    await expect(retryJob(999)).rejects.toThrow(/not found/);
  });
  it("recovers jobs whose worker died mid-run", async () => {
    const h = jest.fn(async () => undefined); registerHandler("EMAIL", h);
    await enqueueJob({ type: "EMAIL", key: "stale", payload: { proposalId: 1 } });
    Object.assign(job.rows[0], { status: "RUNNING", lockedAt: new Date(Date.now() - 10 * 60_000) });
    const s = await runJobs({ budgetMs: 1000, types: ["EMAIL"] });
    expect(s.done).toBe(1);
  });
  it("marks a job failed when no handler exists", async () => {
    await enqueueJob({ type: "PROVISION", key: "nohandler", payload: {}, maxAttempts: 1 });
    // PROVISION handler is not registered in this isolated test module
    const s = await runJobs({ budgetMs: 1000, types: ["PROVISION"] });
    expect(s.failed).toBe(1);
    expect(String(job.rows[0].lastError)).toMatch(/No handler/);
  });
});
