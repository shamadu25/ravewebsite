import { captureAttribution, currentTouch } from "@/lib/attribution";

function visit(url: string, referrer = "") {
  window.history.replaceState(null, "", url);
  Object.defineProperty(document, "referrer", { value: referrer, configurable: true });
}
beforeEach(() => window.localStorage.clear());

describe("campaign attribution", () => {
  it("captures UTM + fbclid + landing URL + referrer", () => {
    visit("/get-started?solution=erp&utm_source=facebook&utm_medium=paid&utm_campaign=c1&utm_content=a&utm_term=t&fbclid=XYZ", "https://l.facebook.com/");
    const { first, latest } = captureAttribution(new Date("2026-01-01T00:00:00Z"));
    expect(latest).toMatchObject({ utm_source: "facebook", utm_medium: "paid", utm_campaign: "c1", utm_content: "a", utm_term: "t", fbclid: "XYZ", referrer: "https://l.facebook.com/", capturedAt: "2026-01-01T00:00:00.000Z" });
    expect(first.landingUrl).toContain("/get-started?");
    expect(first.landingUrl).toContain("utm_campaign=c1");
  });
  it("keeps first touch and moves latest touch only when a new campaign visit arrives", () => {
    visit("/get-started?utm_source=facebook&utm_campaign=spring");
    captureAttribution(new Date("2026-01-01"));
    visit("/get-started?utm_source=instagram&utm_campaign=summer");
    const second = captureAttribution(new Date("2026-02-01"));
    expect(second.first.utm_source).toBe("facebook");
    expect(second.latest.utm_source).toBe("instagram");
    visit("/get-started"); // plain return visit must not erase the ad click
    const third = captureAttribution(new Date("2026-03-01"));
    expect(third.latest.utm_source).toBe("instagram");
    expect(third.first.utm_source).toBe("facebook");
  });
  it("stores only whitelisted campaign keys — never other query parameters (e.g. personal data in a URL)", () => {
    visit("/get-started?utm_source=facebook&email=ama@x.com&phone=0244&name=Ama");
    const t = currentTouch();
    expect(t.landingUrl).toBe("/get-started?utm_source=facebook");
    expect(JSON.stringify(t)).not.toMatch(/ama@x\.com|0244|Ama/);
  });
  it("strips control characters and caps lengths", () => {
    visit("/get-started?utm_source=" + encodeURIComponent("a\u0000b\nc") + "&utm_campaign=" + "z".repeat(400));
    const t = currentTouch();
    expect(t.utm_source).toBe("abc");
    expect((t.utm_campaign ?? "").length).toBe(150);
  });
  it("does not throw when storage is blocked", () => {
    const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    visit("/get-started?utm_source=facebook");
    expect(() => captureAttribution()).not.toThrow();
    spy.mockRestore();
  });
});
