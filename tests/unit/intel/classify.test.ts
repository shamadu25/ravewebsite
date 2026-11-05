/** @jest-environment node */
import { classifyChannel, cleanPath, countryFromTimezone, geoFromHeaders, intentEventForPath, isBotUserAgent, landingWithCampaign, parseUserAgent, pickClickId, referrerDomain, stripReferrer } from "@/lib/analytics/classify";

const own = ["ravesoftsolutions.com"];
describe("traffic attribution", () => {
  it("direct: no referrer, no UTMs", () => expect(classifyChannel({ ownHosts: own })).toBe("direct"));
  it("direct: own-site referrer is never a source", () => expect(classifyChannel({ referrerDomain: "ravesoftsolutions.com", ownHosts: own })).toBe("direct"));
  it("organic search from referrer", () => { expect(classifyChannel({ referrerDomain: "google.com" })).toBe("organic_search"); expect(classifyChannel({ referrerDomain: "bing.com" })).toBe("organic_search"); });
  it("paid search: gclid or cpc medium", () => { expect(classifyChannel({ clickIdType: "gclid" })).toBe("paid_search"); expect(classifyChannel({ utmSource: "google", utmMedium: "cpc" })).toBe("paid_search"); });
  it("social from referrer", () => { expect(classifyChannel({ referrerDomain: "l.facebook.com" })).toBe("social"); expect(classifyChannel({ referrerDomain: "linkedin.com" })).toBe("social"); expect(classifyChannel({ referrerDomain: "t.co" })).toBe("social"); });
  it("paid social: fbclid / ttclid / li_fat_id / paid_social medium", () => {
    expect(classifyChannel({ clickIdType: "fbclid" })).toBe("paid_social");
    expect(classifyChannel({ clickIdType: "ttclid" })).toBe("paid_social");
    expect(classifyChannel({ clickIdType: "li_fat_id" })).toBe("paid_social");
    expect(classifyChannel({ utmSource: "facebook", utmMedium: "paid_social" })).toBe("paid_social");
  });
  it("referral from any other domain", () => expect(classifyChannel({ referrerDomain: "some-blog.com" })).toBe("referral"));
  it("email and whatsapp campaigns", () => {
    expect(classifyChannel({ utmMedium: "email", utmSource: "newsletter" })).toBe("email");
    expect(classifyChannel({ utmSource: "whatsapp", utmMedium: "broadcast" })).toBe("whatsapp");
    expect(classifyChannel({ referrerDomain: "wa.me" })).toBe("whatsapp");
  });
  it("UTMs beat the referrer", () => expect(classifyChannel({ utmMedium: "email", referrerDomain: "google.com" })).toBe("email"));
  it("unknown utm source falls to other", () => expect(classifyChannel({ utmSource: "partnerx", utmMedium: "affiliate" })).toBe("other"));
});

describe("helpers", () => {
  it("referrer domain / stripping keeps no query string", () => {
    expect(referrerDomain("https://www.google.com/search?q=secret")).toBe("google.com");
    expect(stripReferrer("https://www.google.com/search?q=secret#x")).toBe("https://www.google.com/search");
    expect(referrerDomain("not a url")).toBeNull();
  });
  it("cleanPath normalises", () => {
    expect(cleanPath("/contact/?a=1#b")).toBe("/contact");
    expect(cleanPath("https://x.com/blog/a/")).toBe("/blog/a");
    expect(cleanPath("")).toBe("/");
    expect(cleanPath("services")).toBe("/services");
  });
  it("landing keeps only whitelisted campaign params", () => expect(landingWithCampaign("/get-started", { utm_source: "fb", email: "a@b.c", utm_campaign: "x" })).toBe("/get-started?utm_source=fb&utm_campaign=x"));
  it("click id pick validates shape", () => { expect(pickClickId({ gclid: "Cj0KCQ_abc123" })).toEqual({ type: "gclid", id: "Cj0KCQ_abc123" }); expect(pickClickId({ gclid: "<script>" })).toBeNull(); });
  it("intent events", () => { expect(intentEventForPath("/pricing")).toBe("pricing_view"); expect(intentEventForPath("/products/cliqpos")).toBe("product_view"); expect(intentEventForPath("/contact")).toBe("contact_page_view"); expect(intentEventForPath("/about")).toBeNull(); });
});

describe("device, browser and bots", () => {
  it("parses a desktop Chrome UA", () => expect(parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")).toEqual({ device: "desktop", browser: "Chrome", browserVersion: "126", os: "Windows" }));
  it("parses iPhone Safari as mobile", () => { const u = parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"); expect(u).toMatchObject({ device: "mobile", browser: "Safari", os: "iOS" }); });
  it("Android without Mobile is tablet", () => expect(parseUserAgent("Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 Chrome/120.0 Safari/537.36").device).toBe("tablet"));
  it("filters bots and empty UAs, keeps real browsers", () => {
    for (const ua of ["Googlebot/2.1 (+http://www.google.com/bot.html)", "curl/8.4.0", "HeadlessChrome/120", "", null, "Mozilla/5.0 (compatible; AhrefsBot/7.0)", "Lighthouse"]) expect(isBotUserAgent(ua as string | null)).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")).toBe(false);
  });
});

describe("geolocation", () => {
  const hdr = (m: Record<string, string>) => (n: string) => m[n] ?? null;
  it("reads edge headers and decodes the city, flagging the source", () => {
    const g = geoFromHeaders(hdr({ "x-vercel-ip-country": "GH", "x-vercel-ip-city": "Accra", "x-vercel-ip-country-region": "AA" }));
    expect(g).toMatchObject({ countryCode: "GH", city: "Accra", region: "AA", geoSource: "edge_headers" });
    expect(g.country).toBe("Ghana");
  });
  it("decodes url-encoded cities", () => expect(geoFromHeaders(hdr({ "x-vercel-ip-country": "CI", "x-vercel-ip-city": "Abidjan%20Plateau" })).city).toBe("Abidjan Plateau"));
  it("falls back to a labelled time-zone estimate, never to precise data", () => {
    const g = geoFromHeaders(hdr({}), "Africa/Lagos");
    expect(g).toMatchObject({ countryCode: "NG", geoSource: "timezone_estimate", city: null });
    expect(countryFromTimezone("Mars/Base")).toBeNull();
  });
  it("ignores Cloudflare unknown markers", () => expect(geoFromHeaders(hdr({ "cf-ipcountry": "XX" })).countryCode).toBeNull());
});
