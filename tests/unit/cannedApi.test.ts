/** @jest-environment node */
const prismaMock = {
  cannedReply: {
    count: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn(), deleteMany: jest.fn(), update: jest.fn().mockImplementation((a: unknown) => a),
  },
  $transaction: jest.fn().mockResolvedValue([]),
};
jest.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
jest.mock("@/lib/os/audit", () => ({ audit: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/auth/session", () => ({ getAdminSession: jest.fn().mockResolvedValue({ email: "boss@example.com" }) }));
jest.mock("@/lib/os/runtime", () => ({}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/os/canned-replies/route";
import { listCannedReplies } from "@/lib/os/cannedStore";
import { CANNED_REPLIES } from "@/lib/os/cannedReplies";

process.env.ADMIN_EMAIL = "boss@example.com";
let n = 0;
const call = (body: unknown) =>
  POST(new NextRequest("http://x/api/os/canned-replies", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `9.9.9.${++n}` }, body: JSON.stringify(body) }), { params: Promise.resolve({}) });

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.cannedReply.count.mockResolvedValue(3);
  prismaMock.cannedReply.findFirst.mockResolvedValue({ sortOrder: 3 });
  prismaMock.cannedReply.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.cannedReply.deleteMany.mockResolvedValue({ count: 1 });
});

describe("canned replies API", () => {
  it("creates a reply at the end of the list", async () => {
    const res = await call({ action: "create", title: "Pricing", body: "Depends on setup{name}." });
    expect(res.status).toBe(200);
    expect(prismaMock.cannedReply.create).toHaveBeenCalledWith({ data: { title: "Pricing", body: "Depends on setup{name}.", sortOrder: 4 } });
  });

  it("validates input", async () => {
    expect((await call({ action: "create", title: "x", body: "ok ok" })).status).toBe(422);
    expect((await call({ action: "create", title: "Fine", body: "y".repeat(2001) })).status).toBe(422);
    expect((await call({ action: "nonsense" })).status).toBe(422);
    expect(prismaMock.cannedReply.create).not.toHaveBeenCalled();
  });

  it("caps the list at 50", async () => {
    prismaMock.cannedReply.count.mockResolvedValue(50);
    const res = await call({ action: "create", title: "One more", body: "Too many replies" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at most 50/);
  });

  it("404s when updating or deleting something that is gone", async () => {
    prismaMock.cannedReply.updateMany.mockResolvedValue({ count: 0 });
    expect((await call({ action: "update", id: 99, title: "Nope", body: "Nothing here" })).status).toBe(404);
    prismaMock.cannedReply.deleteMany.mockResolvedValue({ count: 0 });
    expect((await call({ action: "delete", id: 99 })).status).toBe(404);
  });

  it("re-numbers the whole list when moving a reply, so order can never tie", async () => {
    prismaMock.cannedReply.findMany.mockResolvedValue([{ id: 10 }, { id: 11 }, { id: 12 }]);
    await call({ action: "move", id: 12, direction: "up" });
    const updates = prismaMock.cannedReply.update.mock.calls.map((c) => [c[0].where.id, c[0].data.sortOrder]);
    expect(updates).toEqual([[10, 1], [12, 2], [11, 3]]);
  });

  it("moving the first reply up is a no-op", async () => {
    prismaMock.cannedReply.findMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    expect((await call({ action: "move", id: 10, direction: "up" })).status).toBe(200);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("copies the defaults only into an empty table", async () => {
    prismaMock.cannedReply.count.mockResolvedValue(2);
    expect((await call({ action: "seed_defaults" })).status).toBe(400);
    prismaMock.cannedReply.count.mockResolvedValue(0);
    expect((await call({ action: "seed_defaults" })).status).toBe(200);
    const data = prismaMock.cannedReply.createMany.mock.calls[0][0].data;
    expect(data).toHaveLength(CANNED_REPLIES.length);
    expect(data[0]).toMatchObject({ title: CANNED_REPLIES[0].title, sortOrder: 1 });
  });
});

describe("listCannedReplies", () => {
  it("returns the team's own replies when they exist", async () => {
    prismaMock.cannedReply.findMany.mockResolvedValue([{ id: 7, title: "Mine", body: "Hello{name}" }]);
    expect(await listCannedReplies()).toEqual({ replies: [{ key: "7", title: "Mine", body: "Hello{name}" }], usingDefaults: false });
  });

  it("falls back to the built-in set when empty or when the table is missing", async () => {
    prismaMock.cannedReply.findMany.mockResolvedValue([]);
    expect(await listCannedReplies()).toEqual({ replies: CANNED_REPLIES, usingDefaults: true });
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    prismaMock.cannedReply.findMany.mockRejectedValue(new Error("table does not exist"));
    expect((await listCannedReplies()).usingDefaults).toBe(true);
    spy.mockRestore();
  });
});
