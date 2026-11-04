/** @jest-environment node */
const prismaMock = { $executeRaw: jest.fn(), $queryRaw: jest.fn() };
jest.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
import { sharedRateLimit } from "@/lib/antispam/sharedLimit";
import { clientIp } from "@/app/api/ai/_shared";
import { NextRequest } from "next/server";

beforeEach(() => { jest.clearAllMocks(); prismaMock.$executeRaw.mockResolvedValue(1); });

describe("sharedRateLimit", () => {
  it("blocks when the SHARED counter (other instances) is over the limit, even if this instance saw little", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ n: BigInt(6) }]);
    expect(await sharedRateLimit(`k-${Math.random()}`, 5, 60_000)).toBe(true);
  });
  it("allows when the shared counter is within the limit", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ n: BigInt(2) }]);
    expect(await sharedRateLimit(`k-${Math.random()}`, 5, 60_000)).toBe(false);
  });
  it("does not touch the database once the in-memory limit already blocks (cheap burst absorption)", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ n: 1 }]);
    const k = `k-${Math.random()}`;
    for (let i = 0; i < 3; i++) await sharedRateLimit(k, 2, 60_000);
    const callsBefore = prismaMock.$executeRaw.mock.calls.length;
    expect(await sharedRateLimit(k, 2, 60_000)).toBe(true);
    expect(prismaMock.$executeRaw.mock.calls.length).toBe(callsBefore);
  });
  it("fails OPEN if the database is down (real customers are never blocked by an outage)", async () => {
    prismaMock.$executeRaw.mockRejectedValue(new Error("db down"));
    expect(await sharedRateLimit(`k-${Math.random()}`, 5, 60_000)).toBe(false);
  });
  it("hashes very long keys so they fit the key column", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ n: 1 }]);
    await sharedRateLimit("x".repeat(500), 5, 60_000);
    const keyArg = prismaMock.$executeRaw.mock.calls[0][1] as string;
    expect(keyArg.length).toBeLessThanOrEqual(190);
  });
});

describe("clientIp on Vercel", () => {
  const req = (h: Record<string, string>) => new NextRequest("http://x/", { headers: h });
  afterEach(() => { delete process.env.VERCEL; });
  it("uses Vercel's own header and ignores a spoofed X-Forwarded-For", () => {
    process.env.VERCEL = "1";
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6", "x-vercel-forwarded-for": "41.0.0.9" }))).toBe("41.0.0.9");
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6", "x-real-ip": "41.0.0.8" }))).toBe("41.0.0.8");
  });
  it("outside Vercel the x-vercel header is ignored (cannot be spoofed to evade limits)", () => {
    expect(clientIp(req({ "x-forwarded-for": "7.7.7.7", "x-vercel-forwarded-for": "1.2.3.4" }))).toBe("7.7.7.7");
  });
});
