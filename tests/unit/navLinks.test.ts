/** @jest-environment node */
import fs from "fs";
import path from "path";
import { FOOTER_LINKS, INDUSTRIES, NAV_LINKS, NAV_SERVICES, PRODUCTS } from "@/lib/data";

/** A href is valid if a static page exists for it in the marketing route group. */
function routeExists(href: string): boolean {
  const clean = href.split("#")[0].split("?")[0];
  const base = path.join(process.cwd(), "src/app/(marketing)", clean === "/" ? "" : clean);
  return fs.existsSync(path.join(base, "page.tsx"));
}

describe("navigation links resolve to real pages", () => {
  const all: [string, string][] = [
    ...NAV_LINKS.map((l) => ["nav", l.href] as [string, string]),
    ...NAV_SERVICES.map((l) => ["services menu", l.href] as [string, string]),
    ...PRODUCTS.map((p) => ["products menu", p.href] as [string, string]),
    ...Object.entries(FOOTER_LINKS).flatMap(([group, links]) => links.map((l) => [`footer ${group}`, l.href] as [string, string])),
  ];
  it.each(all)("%s → %s", (_where, href) => {
    expect(routeExists(href)).toBe(true);
  });

  it("every product page exists (no product is orphaned from the menu)", () => {
    for (const p of PRODUCTS) expect(routeExists(p.href)).toBe(true);
    expect(INDUSTRIES.length).toBeGreaterThan(0);
  });
});
