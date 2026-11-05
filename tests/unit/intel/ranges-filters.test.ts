/** @jest-environment node */
import { dayKeys, pctChange, resolveRange } from "@/lib/analytics/ranges";
import { conversionWhere, filterQuery, parseFilters, sessionWhere } from "@/lib/analytics/filters";

const NOW = new Date("2026-11-05T14:30:00.000Z");
describe("date filters", () => {
  it.each([
    ["today", "2026-11-05", "2026-11-06"], ["yesterday", "2026-11-04", "2026-11-05"], ["7d", "2026-10-30", "2026-11-06"], ["30d", "2026-10-07", "2026-11-06"],
    ["90d", "2026-08-08", "2026-11-06"], ["this_month", "2026-11-01", "2026-11-06"], ["last_month", "2026-10-01", "2026-11-01"], ["this_year", "2026-01-01", "2026-11-06"],
  ])("%s", (preset, from, to) => { const r = resolveRange(preset, null, null, NOW); expect(r.from.toISOString().slice(0, 10)).toBe(from); expect(r.to.toISOString().slice(0, 10)).toBe(to); });
  it("previous period has the same length and ends where the current starts", () => { const r = resolveRange("7d", null, null, NOW); expect(r.prevTo).toEqual(r.from); expect(r.prevTo.getTime() - r.prevFrom.getTime()).toBe(r.to.getTime() - r.from.getTime()); });
  it("custom range is inclusive of the end day and validated", () => {
    const r = resolveRange("custom", "2026-10-01", "2026-10-10", NOW); expect(r.days).toBe(10); expect(r.to.toISOString().slice(0, 10)).toBe("2026-10-11");
    expect(resolveRange("custom", "garbage", "2026-10-10", NOW).preset).toBe("30d");
    expect(resolveRange("custom", "2026-10-10", "2026-10-01", NOW).preset).toBe("30d");
  });
  it("unknown preset defaults to 30 days", () => expect(resolveRange("zzz", null, null, NOW).days).toBe(30));
  it("pctChange handles zero baseline", () => { expect(pctChange(150, 100)).toBe(50); expect(pctChange(5, 0)).toBeNull(); expect(pctChange(80, 100)).toBe(-20); });
  it("dayKeys enumerates each day", () => expect(dayKeys(new Date("2026-11-01T00:00:00Z"), new Date("2026-11-04T00:00:00Z"))).toEqual(["2026-11-01", "2026-11-02", "2026-11-03"]));
});

describe("dashboard filters", () => {
  it("parses and validates country, channel, campaign and device", () => {
    const f = parseFilters({ range: "7d", country: "gh", channel: "paid_search", campaign: "cliqpos_launch", device: "mobile" }, NOW);
    expect(f).toMatchObject({ country: "GH", channel: "paid_search", campaign: "cliqpos_launch", device: "mobile" });
  });
  it("drops injected or malformed values", () => {
    const f = parseFilters({ country: "GH'; DROP TABLE x;--", channel: "x y", device: "tv", campaign: "a;b" }, NOW);
    expect(f.country).toBeUndefined(); expect(f.channel).toBeUndefined(); expect(f.device).toBeUndefined(); expect(f.campaign).toBeUndefined();
  });
  it("builds a parameterised WHERE (values are bound, never interpolated)", () => {
    const f = parseFilters({ range: "7d", country: "GH", channel: "organic_search", campaign: "x", device: "mobile" }, NOW);
    const w = sessionWhere(f);
    expect(w.sql).toMatch(/s\.country_code = \?/); expect(w.sql).toMatch(/s\.channel = \?/); expect(w.sql).toMatch(/s\.utm_campaign = \?/); expect(w.sql).toMatch(/s\.device = \?/);
    expect(w.values).toEqual(expect.arrayContaining(["GH", "organic_search", "x", "mobile"]));
    expect(w.sql).not.toContain("GH");
    expect(conversionWhere(f).sql).toMatch(/c\.lt_channel = \?/);
  });
  it("without filters only the date window applies", () => expect(sessionWhere(parseFilters({}, NOW)).values).toHaveLength(2));
  it("round-trips filters into links", () => expect(filterQuery(parseFilters({ range: "7d", country: "GH" }, NOW), { report: "pages" })).toBe("range=7d&country=GH&report=pages"));
});
