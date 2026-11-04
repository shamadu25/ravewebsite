const prismaMock = {
  contact: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  company: { findFirst: jest.fn(), create: jest.fn() },
  lead: { create: jest.fn() },
  conversionEvent: { findFirst: jest.fn(), create: jest.fn() },
};
jest.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { EnquirySchema, persistEnquiry, splitName } from "@/lib/enquiry";

const base = EnquirySchema.parse({ fullName: "Kofi Mensah", email: "Kofi@Example.com", message: "Need a POS", projectType: "POS", companyName: "Kofi Ltd" });

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.contact.findFirst.mockResolvedValue(null);
  prismaMock.contact.create.mockResolvedValue({ id: 11 });
  prismaMock.company.findFirst.mockResolvedValue(null);
  prismaMock.company.create.mockResolvedValue({ id: 5 });
  prismaMock.lead.create.mockResolvedValue({ id: 99 });
  prismaMock.conversionEvent.findFirst.mockResolvedValue(null);
});

describe("persistEnquiry", () => {
  it("creates contact, lead (source website_contact_form) and a lead_created event", async () => {
    const r = await persistEnquiry(base);
    expect(r).toEqual({ leadId: 99, contactId: 11, duplicate: false });
    expect(prismaMock.contact.create.mock.calls[0][0].data).toMatchObject({ firstName: "Kofi", lastName: "Mensah", email: "kofi@example.com", companyId: 5 });
    expect(prismaMock.lead.create.mock.calls[0][0].data).toMatchObject({ source: "website_contact_form", serviceInterest: "POS", stage: "new", contactId: 11 });
    expect(prismaMock.conversionEvent.create.mock.calls[0][0].data).toMatchObject({ eventType: "lead_created", leadId: 99 });
  });

  it("reuses an existing contact and does not overwrite stored details", async () => {
    prismaMock.contact.findFirst.mockResolvedValue({ id: 3, firstName: "Existing", lastName: "Name", phone: "0200", companyId: 1 });
    await persistEnquiry({ ...base, phone: "0555" });
    expect(prismaMock.contact.create).not.toHaveBeenCalled();
    expect(prismaMock.contact.update.mock.calls[0][0].data).toEqual({});
    expect(prismaMock.lead.create.mock.calls[0][0].data.contactId).toBe(3);
  });

  it("collapses an identical re-submission into the original lead", async () => {
    prismaMock.contact.findFirst.mockResolvedValue({ id: 3 });
    prismaMock.conversionEvent.findFirst.mockResolvedValue({ leadId: 42 });
    const r = await persistEnquiry(base);
    expect(r).toEqual({ leadId: 42, contactId: 3, duplicate: true });
    expect(prismaMock.lead.create).not.toHaveBeenCalled();
  });
});

describe("EnquirySchema / splitName", () => {
  it("keeps the old payload valid (new fields optional)", () => {
    expect(EnquirySchema.safeParse({ fullName: "A", email: "a@b.co", message: "hi" }).success).toBe(true);
  });
  it("rejects bad email and empty message", () => {
    expect(EnquirySchema.safeParse({ fullName: "A", email: "nope", message: "hi" }).success).toBe(false);
    expect(EnquirySchema.safeParse({ fullName: "A", email: "a@b.co", message: "" }).success).toBe(false);
  });
  it("splits names", () => {
    expect(splitName("Ama")).toEqual({ firstName: "Ama", lastName: null });
    expect(splitName("Ama K. Boateng")).toEqual({ firstName: "Ama", lastName: "K. Boateng" });
  });
});
