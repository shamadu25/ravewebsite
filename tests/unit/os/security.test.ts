/** @jest-environment node */
import { can, meetsRole } from "@/lib/os/rbac";
import { canonicalJson, computeAuditHash, findChainBreak, redact, type HashableEntry } from "@/lib/os/audit";
import { analyseHtml, isPrivateAddress } from "@/lib/os/website";
import { computeHealth } from "@/lib/os/health";
import { rankEntries } from "@/lib/os/brain";
import { needsApproval, type ToolDefinition } from "@/lib/os/tools/registry";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));

describe("RBAC", () => {
  it("grants CEO everything and VIEWER read-only", () => {
    expect(can("CEO", "deployment.execute")).toBe(true);
    expect(can("VIEWER", "agent.read")).toBe(true);
    expect(can("VIEWER", "agent.execute")).toBe(false);
    expect(can("SALES", "finance.approve")).toBe(false);
    expect(can("FINANCE", "finance.approve")).toBe(true);
  });
  it("orders roles for approval requirements", () => {
    expect(meetsRole("SUPER_ADMIN", "CEO")).toBe(true);
    expect(meetsRole("MANAGER", "CEO")).toBe(false);
  });
});

describe("audit chain", () => {
  const mk = (n: number, prevHash: string): HashableEntry & { id: number; hash: string } => {
    const e: HashableEntry = { actor: "a", actorType: "SYSTEM", action: `act${n}`, resource: "r", resourceId: String(n), input: null, output: null, result: "SUCCESS", prevHash, createdAt: new Date(2026, 0, n) };
    return { ...e, id: n, hash: computeAuditHash(e) };
  };
  it("verifies an intact chain and detects tampering or deletion", () => {
    const a = mk(1, "GENESIS"); const b = mk(2, a.hash); const c = mk(3, b.hash);
    expect(findChainBreak([a, b, c])).toBeNull();
    expect(findChainBreak([a, { ...b, action: "edited" }, c])).toBe(2);
    expect(findChainBreak([a, c])).toBe(3);
  });
  it("hashes identically regardless of JSON key order (MySQL re-orders keys)", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } })).toBe(canonicalJson({ a: { c: [3, { y: 2, z: 1 }], d: 2 }, b: 1 }));
    const base = { actor: "a", actorType: "SYSTEM", action: "x", resource: "r", resourceId: null, result: "SUCCESS", prevHash: "GENESIS", createdAt: new Date(0) };
    expect(computeAuditHash({ ...base, input: { a: 1, b: 2 }, output: null })).toBe(computeAuditHash({ ...base, input: { b: 2, a: 1 }, output: undefined }));
  });
  it("redacts credentials before logging", () => {
    expect(redact({ apiKey: "sk-123", nested: { password: "x", ok: 1 } })).toEqual({ apiKey: "[REDACTED]", nested: { password: "[REDACTED]", ok: 1 } });
  });
});

describe("SSRF guard", () => {
  it.each(["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.20.0.1", "169.254.169.254", "::1", "fd00::1"])("blocks %s", (ip) => expect(isPrivateAddress(ip)).toBe(true));
  it.each(["8.8.8.8", "1.1.1.1"])("allows %s", (ip) => expect(isPrivateAddress(ip)).toBe(false));
});

describe("website analysis", () => {
  it("detects booking, WhatsApp and absence of chat", () => {
    const a = analyseHtml(`<title>Smile Dental</title><a href="https://wa.me/233201234567">WhatsApp us</a><a>Book appointment online</a><p>Call +233 20 123 4567 or info@smile.com</p>`);
    expect(a.signals.bookingFlow).toBe(true);
    expect(a.signals.whatsappContact).toBe(true);
    expect(a.signals.liveChatPresent).toBe(false);
    expect(a.emails).toContain("info@smile.com");
    expect(a.title).toBe("Smile Dental");
  });
});

describe("customer health", () => {
  it("flags a sharp usage drop RED", () => {
    expect(computeHealth({ status: "ACTIVE", lastActiveAt: new Date(), usage30d: 40, usagePrev30d: 100 }).health).toBe("RED");
  });
  it("does not claim GREEN without signals", () => {
    const h = computeHealth({ status: "ACTIVE", lastActiveAt: null, usage30d: null, usagePrev30d: null });
    expect(h.health).toBe("YELLOW");
    expect(h.reasons.join(" ")).toMatch(/INSUFFICIENT DATA/);
  });
});

describe("Company Brain retrieval", () => {
  it("ranks relevant entries and returns nothing for unrelated queries", () => {
    const rows = [{ title: "Pricing", content: "KOVABOT costs $99 per month" }, { title: "Holiday policy", content: "Closed on Sundays" }];
    expect(rankEntries(rows, "what is the kovabot pricing", 3)[0].title).toBe("Pricing");
    expect(rankEntries(rows, "quantum", 3)).toEqual([]);
  });
});

describe("autonomy gating", () => {
  const tool = (risk: ToolDefinition["riskLevel"], hard = false): ToolDefinition => ({ name: "t", description: "", provider: "x", permissions: [], inputSchema: {}, riskLevel: risk, alwaysRequiresApproval: hard, status: () => ({ enabled: true }) });
  it("ASSISTED needs approval for anything above LOW", () => {
    expect(needsApproval(tool("LOW"), "ASSISTED", null)).toBe(false);
    expect(needsApproval(tool("MEDIUM"), "ASSISTED", null)).toBe(true);
  });
  it("SEMI_AUTONOMOUS gates HIGH only; AUTONOMOUS gates only hard-flagged tools", () => {
    expect(needsApproval(tool("MEDIUM"), "SEMI_AUTONOMOUS", null)).toBe(false);
    expect(needsApproval(tool("HIGH"), "SEMI_AUTONOMOUS", null)).toBe(true);
    expect(needsApproval(tool("HIGH"), "AUTONOMOUS", null)).toBe(false);
    expect(needsApproval(tool("CRITICAL", true), "AUTONOMOUS", null)).toBe(true);
  });
  it("per-agent alwaysFor overrides autonomy", () => {
    expect(needsApproval({ ...tool("LOW"), name: "outreach.send" }, "AUTONOMOUS", { alwaysFor: ["outreach.send"] })).toBe(true);
  });
});
