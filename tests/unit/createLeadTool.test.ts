const mockConversationFindUniqueOrThrow = jest.fn();
const mockConversationUpdate = jest.fn();
const mockContactUpdate = jest.fn();
const mockContactCreate = jest.fn();
const mockLeadFindUnique = jest.fn();
const mockLeadCreate = jest.fn();
const mockConversionEventCreate = jest.fn();
const mockCompanyFindFirst = jest.fn();
const mockCompanyCreate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUniqueOrThrow: (...args: unknown[]) => mockConversationFindUniqueOrThrow(...args),
      update: (...args: unknown[]) => mockConversationUpdate(...args),
    },
    contact: {
      update: (...args: unknown[]) => mockContactUpdate(...args),
      create: (...args: unknown[]) => mockContactCreate(...args),
    },
    lead: {
      findUnique: (...args: unknown[]) => mockLeadFindUnique(...args),
      create: (...args: unknown[]) => mockLeadCreate(...args),
    },
    conversionEvent: {
      create: (...args: unknown[]) => mockConversionEventCreate(...args),
    },
    company: {
      findFirst: (...args: unknown[]) => mockCompanyFindFirst(...args),
      create: (...args: unknown[]) => mockCompanyCreate(...args),
    },
  },
}));

import { CreateLeadTool } from "@/lib/ai/tools/createLeadTool";

describe("CreateLeadTool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConversationFindUniqueOrThrow.mockResolvedValue({ id: 1, contactId: null });
    mockContactCreate.mockResolvedValue({ id: 10 });
    mockLeadFindUnique.mockResolvedValue(null);
    mockLeadCreate.mockResolvedValue({ id: 100 });
    mockConversionEventCreate.mockResolvedValue({});
    mockConversationUpdate.mockResolvedValue({});
  });

  it("rejects input without any contact channel", async () => {
    await expect(
      CreateLeadTool.execute({ conversation_id: 1, first_name: "Kwame" })
    ).rejects.toThrow(/contact channel/);
  });

  it("creates a contact and lead when a channel is present", async () => {
    const result = await CreateLeadTool.execute({
      conversation_id: 1,
      first_name: "Kwame",
      whatsapp: "+233501234567",
      service_interest: "whatsapp_automation",
    });

    expect(result).toEqual({ lead_id: 100, contact_id: 10 });
    expect(mockContactCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ whatsapp: "+233501234567" }) })
    );
    expect(mockLeadCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ conversationId: 1, serviceInterest: "whatsapp_automation" }),
      })
    );
  });

  it("reuses an existing lead for the same conversation instead of duplicating", async () => {
    mockLeadFindUnique.mockResolvedValue({ id: 55 });

    const result = await CreateLeadTool.execute({ conversation_id: 1, email: "kwame@example.com" });

    expect(result.lead_id).toBe(55);
    expect(mockLeadCreate).not.toHaveBeenCalled();
  });

  it("updates the existing contact instead of creating a new one when the conversation already has a contact", async () => {
    mockConversationFindUniqueOrThrow.mockResolvedValue({ id: 1, contactId: 10 });
    mockContactUpdate.mockResolvedValue({ id: 10 });

    await CreateLeadTool.execute({ conversation_id: 1, email: "kwame@example.com" });

    expect(mockContactUpdate).toHaveBeenCalled();
    expect(mockContactCreate).not.toHaveBeenCalled();
  });

  it("requires a numeric conversation_id", async () => {
    await expect(CreateLeadTool.execute({ email: "a@b.com" })).rejects.toThrow(/conversation_id/);
  });
});
