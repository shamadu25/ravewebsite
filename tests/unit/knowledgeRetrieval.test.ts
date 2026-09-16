const mockFindMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    knowledgeDocument: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import { searchKnowledge } from "@/lib/services/knowledgeRetrieval";

const doc = (overrides: Partial<Record<string, unknown>>) => ({
  id: 1,
  title: "",
  content: "",
  category: "faq",
  status: "published",
  ...overrides,
});

describe("searchKnowledge", () => {
  beforeEach(() => mockFindMany.mockReset());

  it("ranks documents by keyword match count", async () => {
    mockFindMany.mockResolvedValue([
      doc({ id: 1, title: "Hotel management system", content: "Bookings, rooms, guests, billing, housekeeping for hotels." }),
      doc({ id: 2, title: "CliqPOS overview", content: "Point of sale for retail businesses." }),
    ]);

    const results = await searchKnowledge("hotel bookings rooms guests");

    expect(results[0].title).toBe("Hotel management system");
  });

  it("returns no results for an empty/whitespace query without hitting the database", async () => {
    const results = await searchKnowledge("   ");

    expect(results).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("filters out documents with a zero keyword match score", async () => {
    mockFindMany.mockResolvedValue([doc({ title: "Unrelated", content: "Nothing matches here." })]);

    const results = await searchKnowledge("cliqpos pricing");

    expect(results).toEqual([]);
  });

  it("passes the category filter through to the query", async () => {
    mockFindMany.mockResolvedValue([]);

    await searchKnowledge("cliqpos", { category: "cliqpos" });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: "cliqpos" }),
      })
    );
  });
});
