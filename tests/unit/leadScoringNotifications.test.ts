const mockCreate = jest.fn();
const mockFindFirst = jest.fn();
const mockLeadFindUnique = jest.fn();
const mockSendHotLeadNotification = jest.fn();

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
  sendHotLeadNotification: (...args: unknown[]) => mockSendHotLeadNotification(...args),
}));

import { scoreLead } from "@/lib/services/leadScoring";

describe("scoreLead notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockImplementation(({ data }) => ({ ...data, id: 1, components: data.components.create }));
    mockLeadFindUnique.mockResolvedValue({
      id: 1,
      serviceInterest: "whatsapp_automation",
      contact: { firstName: "Ama", lastName: "Mensah", email: "ama@example.com", phone: null, whatsapp: null },
      company: null,
    });
  });

  it("sends a hot lead notification the first time a lead crosses into hot", async () => {
    mockFindFirst.mockResolvedValue(null);

    await scoreLead(1, {
      decision_maker: true,
      clear_problem: true,
      high_business_impact: true,
      implementation_under_30_days: true,
      pricing_interest: true,
      demo_interest: true,
      meaningful_lead_volume: true,
    });

    expect(mockSendHotLeadNotification).toHaveBeenCalledTimes(1);
    expect(mockSendHotLeadNotification).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: 1, contactName: "Ama Mensah" })
    );
  });

  it("does not re-notify if the lead was already hot before", async () => {
    mockFindFirst.mockResolvedValue({ id: 99, level: "hot" });

    await scoreLead(1, {
      decision_maker: true,
      clear_problem: true,
      high_business_impact: true,
      implementation_under_30_days: true,
      pricing_interest: true,
      demo_interest: true,
      meaningful_lead_volume: true,
    });

    expect(mockSendHotLeadNotification).not.toHaveBeenCalled();
  });

  it("does not notify for a non-hot score", async () => {
    mockFindFirst.mockResolvedValue(null);

    await scoreLead(1, { decision_maker: true });

    expect(mockSendHotLeadNotification).not.toHaveBeenCalled();
  });
});
