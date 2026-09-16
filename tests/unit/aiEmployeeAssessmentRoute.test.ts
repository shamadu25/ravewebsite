/**
 * @jest-environment node
 */
const mockCompanyFindFirst = jest.fn();
const mockCompanyCreate = jest.fn();
const mockContactFindFirst = jest.fn();
const mockContactCreate = jest.fn();
const mockContactUpdate = jest.fn();
const mockLeadCreate = jest.fn();
const mockConversionEventCreate = jest.fn();
const mockScoreLead = jest.fn();
const mockSendAssessmentCompletedNotification = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    company: { findFirst: (...a: unknown[]) => mockCompanyFindFirst(...a), create: (...a: unknown[]) => mockCompanyCreate(...a) },
    contact: {
      findFirst: (...a: unknown[]) => mockContactFindFirst(...a),
      create: (...a: unknown[]) => mockContactCreate(...a),
      update: (...a: unknown[]) => mockContactUpdate(...a),
    },
    lead: { create: (...a: unknown[]) => mockLeadCreate(...a) },
    conversionEvent: { create: (...a: unknown[]) => mockConversionEventCreate(...a) },
  },
}));

jest.mock("@/lib/services/leadScoring", () => ({
  scoreLead: (...a: unknown[]) => mockScoreLead(...a),
}));

jest.mock("@/lib/mail/notifications", () => ({
  sendAssessmentCompletedNotification: (...a: unknown[]) => mockSendAssessmentCompletedNotification(...a),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/ai-employee/assessment/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ai-employee/assessment", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const VALID_BODY = {
  answers: {
    businessType: "retail_ecommerce",
    mainProblem: "slow_response",
    inquiryChannel: "whatsapp",
    inquiryVolume: "20_100",
    responseSpeed: "after_24h",
    successCriteria: "Faster replies",
  },
  contact: {
    fullName: "Ama Mensah",
    businessName: "Ama's Boutique",
    workEmail: "ama@example.com",
    whatsapp: "+233241234567",
    country: "Ghana",
  },
  attribution: { utmSource: "facebook" },
  consent: true,
};

describe("POST /api/ai-employee/assessment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompanyFindFirst.mockResolvedValue(null);
    mockCompanyCreate.mockResolvedValue({ id: 1, name: "Ama's Boutique" });
    mockContactFindFirst.mockResolvedValue(null);
    mockContactCreate.mockResolvedValue({ id: 10 });
    mockLeadCreate.mockResolvedValue({ id: 100 });
    mockConversionEventCreate.mockResolvedValue({});
    mockScoreLead.mockResolvedValue({});
    mockSendAssessmentCompletedNotification.mockResolvedValue(undefined);
  });

  it("persists the lead and returns a recommendation for a valid submission", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.lead_id).toBe(100);
    expect(json.recommendation.agentName).toBe("AI WhatsApp Employee");
    expect(mockLeadCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ serviceInterest: "AI WhatsApp Employee" }) })
    );
    expect(mockSendAssessmentCompletedNotification).toHaveBeenCalled();
  });

  it("rejects a request with an invalid email", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, contact: { ...VALID_BODY.contact, workEmail: "not-an-email" } })
    );
    expect(response.status).toBe(422);
    expect(mockLeadCreate).not.toHaveBeenCalled();
  });

  it("rejects a request with an invalid enum answer", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, answers: { ...VALID_BODY.answers, mainProblem: "not_a_real_problem" } })
    );
    expect(response.status).toBe(422);
  });

  it("reuses an existing contact instead of creating a duplicate", async () => {
    mockContactFindFirst.mockResolvedValue({ id: 55 });
    mockContactUpdate.mockResolvedValue({ id: 55 });

    await POST(makeRequest(VALID_BODY));

    expect(mockContactUpdate).toHaveBeenCalled();
    expect(mockContactCreate).not.toHaveBeenCalled();
  });
});
