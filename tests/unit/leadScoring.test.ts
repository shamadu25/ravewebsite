const mockCreate = jest.fn();
const mockFindFirst = jest.fn();
const mockLeadFindUnique = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    leadScore: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
    lead: {
      findUnique: (...args: unknown[]) => mockLeadFindUnique(...args),
    },
  },
}));

jest.mock("@/lib/mail/notifications", () => ({
  sendHotLeadNotification: jest.fn(),
}));

import { scoreLead } from "@/lib/services/leadScoring";

describe("scoreLead", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockImplementation(({ data }) => ({
      ...data,
      id: 1,
      components: data.components.create,
    }));
    mockFindFirst.mockResolvedValue(null);
    mockLeadFindUnique.mockResolvedValue({
      id: 1,
      serviceInterest: null,
      contact: { firstName: "Test", lastName: "Lead", email: null, phone: null, whatsapp: null },
      company: null,
    });
  });

  it("sums weighted signals into a total score", async () => {
    const score = await scoreLead(1, {
      decision_maker: true,
      clear_problem: true,
      contact_details_complete: true,
      pricing_interest: false,
    });

    expect(score.totalScore).toBe(35);
    expect(score.level).toBe("nurture");
    expect(score.components).toHaveLength(3);
  });

  it("caps the total score at one hundred", async () => {
    const score = await scoreLead(1, {
      decision_maker: true,
      clear_problem: true,
      high_business_impact: true,
      implementation_under_30_days: true,
      pricing_interest: true,
      demo_interest: true,
      meaningful_lead_volume: true,
      contact_details_complete: true,
      returning_high_intent_visitor: true,
    });

    expect(score.totalScore).toBe(100);
    expect(score.level).toBe("hot");
  });

  it("returns low level for no signals", async () => {
    const score = await scoreLead(1, {});

    expect(score.totalScore).toBe(0);
    expect(score.level).toBe("low");
  });

  it("ignores unknown signal keys", async () => {
    const score = await scoreLead(1, { not_a_real_signal: true });

    expect(score.totalScore).toBe(0);
  });
});
