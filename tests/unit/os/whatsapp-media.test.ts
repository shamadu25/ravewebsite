/** @jest-environment node */
const mockPrisma: any = {
  osOutreach: { findUniqueOrThrow: jest.fn(), update: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue(null) },
  osOpportunity: { update: jest.fn(), findUnique: jest.fn(), }, osActivity: { create: jest.fn(), count: jest.fn() }, osOptOut: { findFirst: jest.fn().mockResolvedValue(null) }, systemSetting: { findUnique: jest.fn().mockResolvedValue(null) },
};
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/os/audit", () => ({ audit: jest.fn().mockResolvedValue(undefined) }));
const send = jest.fn();
jest.mock("@/lib/os/channels", () => ({ getChannelAdapter: () => ({ send, status: () => ({ connected: true }) }) }));
jest.mock("@/lib/os/crm", () => ({ logActivity: jest.fn(), setStage: jest.fn() }));

import { internationalDigits, waLink, whatsappText } from "@/lib/os/whatsapp-link";
import { mediaToMessage, validateMedia, MAX_MEDIA_BYTES } from "@/lib/os/media";
import { sendOutreach } from "@/lib/os/outreach";

describe("wa.me helper (human-sent WhatsApp)", () => {
  it("converts local numbers to international using the country", () => {
    expect(internationalDigits("0244 123 456", "Ghana")).toBe("233244123456");
    expect(internationalDigits("0803 123 4567", "Nigeria")).toBe("2348031234567");
    expect(internationalDigits("+233 24 123 4567")).toBe("233241234567");
    expect(internationalDigits("00233241234567")).toBe("233241234567");
    expect(internationalDigits("233241234567")).toBe("233241234567");
  });
  it("refuses numbers it cannot place safely instead of guessing", () => {
    expect(internationalDigits("0244123456")).toBeNull();            // local, no country
    expect(internationalDigits("0244123456", "Atlantis")).toBeNull();
    expect(internationalDigits("12345")).toBeNull();
    expect(internationalDigits(null)).toBeNull();
    expect(internationalDigits("+1")).toBeNull();
  });
  it("builds an encoded click-to-chat link and a short, opt-out-friendly opener", () => {
    const text = whatsappText({ companyName: "Smile Dental", contactName: "Dr Ama Mensah", recommendedEmployees: ["AI Dental Receptionist"], industry: "Dental" });
    expect(text).toMatch(/^Hi Dr,/);
    expect(text).toMatch(/I won't message again/);
    const link = waLink("0244123456", text, "Ghana")!;
    expect(link.startsWith("https://wa.me/233244123456?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toBe(text);
    expect(waLink("garbage", text)).toBeNull();
  });
});

describe("media validation (public upload safety)", () => {
  it("accepts voice notes and photos, rejects everything else and oversize files", () => {
    expect(validateMedia("audio/webm;codecs=opus", 5000)).toEqual({ kind: "audio" });
    expect(validateMedia("image/jpeg", 5000)).toEqual({ kind: "image" });
    expect(validateMedia("application/pdf", 5000)).toHaveProperty("error");
    expect(validateMedia("text/html", 5000)).toHaveProperty("error");
    expect(validateMedia("image/svg+xml", 5000)).toHaveProperty("error");   // SVG can carry scripts
    expect(validateMedia("image/png", 0)).toHaveProperty("error");
    expect(validateMedia("audio/ogg", MAX_MEDIA_BYTES + 1)).toHaveProperty("error");
  });
  it("turns model output into a clear chat message and never invents content", () => {
    const base = { provider: "google", model: "m", costUsd: 0, language: "en" };
    expect(mediaToMessage("audio", { ...base, text: "I need 3 POS terminals", summary: "wants POS" })).toBe("[Voice note] I need 3 POS terminals");
    expect(mediaToMessage("image", { ...base, text: "Rice 50kg - GHS 600", summary: "A price list" })).toBe("[Photo] A price list Text in the photo: Rice 50kg - GHS 600");
    expect(mediaToMessage("audio", { ...base, text: "", summary: "" })).toMatch(/could not be understood/);
    expect(mediaToMessage("image", { ...base, text: "", summary: "" })).toMatch(/no readable content/);
  });
});

describe("WhatsApp consent guard (protects the number)", () => {
  const actor = { actor: "t", actorType: "HUMAN" as const };
  beforeEach(() => { jest.clearAllMocks(); mockPrisma.osOptOut.findFirst.mockResolvedValue(null); mockPrisma.systemSetting.findUnique.mockResolvedValue(null); mockPrisma.osOutreach.findUniqueOrThrow.mockResolvedValue({ id: 1, orgId: "ravesoft", opportunityId: 5, channel: "WHATSAPP", toAddress: "+233241234567", subject: null, body: "hi", status: "DRAFT", purpose: "OUTREACH", touch: 1 }); });
  it("blocks a cold WhatsApp send and never calls the provider", async () => {
    mockPrisma.osOpportunity.findUnique.mockResolvedValue({ customFields: null }); mockPrisma.osActivity.count.mockResolvedValue(0);
    const r = await sendOutreach(1, actor);
    expect(r.status).toBe("BLOCKED"); expect(r.reason).toMatch(/messaged you or opted in/); expect(send).not.toHaveBeenCalled();
  });
  it("allows it once they messaged us, or a human recorded an opt-in", async () => {
    send.mockResolvedValue({ ok: true, providerRef: "w1" });
    mockPrisma.osOpportunity.findUnique.mockResolvedValue({ customFields: null }); mockPrisma.osActivity.count.mockResolvedValue(1);
    expect((await sendOutreach(1, actor)).status).toBe("SENT");
    mockPrisma.osOpportunity.findUnique.mockResolvedValue({ customFields: { whatsappOptIn: true } }); mockPrisma.osActivity.count.mockResolvedValue(0);
    expect((await sendOutreach(1, actor)).status).toBe("SENT");
  });
});
