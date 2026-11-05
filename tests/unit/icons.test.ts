/** @jest-environment node */
import fs from "fs";
import path from "path";

const root = process.cwd();
const png = (f: string) => {
  const b = fs.readFileSync(path.join(root, "public/img", f));
  expect(b.subarray(1, 4).toString()).toBe("PNG");
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
};

describe("RaveSoft icon set", () => {
  it.each([["icon-32.png", 32], ["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512], ["icon-maskable-512.png", 512], ["icon-mark.png", 256]])(
    "%s is %ipx square", (f, size) => expect(png(f)).toMatchObject({ w: size, h: size }));

  it("iOS / Android icons are opaque (no alpha channel); the favicon and in-app mark are transparent", () => {
    for (const f of ["apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"]) expect(png(f).colorType).toBe(2); // RGB
    for (const f of ["icon-32.png", "icon-mark.png"]) expect(png(f).colorType).toBe(6); // RGBA
  });

  it("favicon.ico contains 16, 32 and 48px images", () => {
    const b = fs.readFileSync(path.join(root, "src/app/favicon.ico"));
    expect(b.readUInt16LE(2)).toBe(1); // type: icon
    const n = b.readUInt16LE(4);
    expect(Array.from({ length: n }, (_, i) => b[6 + 16 * i] || 256).sort((x, y) => x - y)).toEqual([16, 32, 48]);
  });

  it("icon.svg is a valid vector using the brand blue and orange", () => {
    const s = fs.readFileSync(path.join(root, "public/img/icon.svg"), "utf8");
    expect(s).toMatch(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(s).toContain("#01A4E3");
    expect(s).toContain("#FE5B00");
    expect((s.match(/<rect /g) ?? []).length).toBe(8);
  });

  it("the site declares the new icons (not the old wordmark squashed into a square)", () => {
    const layout = fs.readFileSync(path.join(root, "src/app/(marketing)/layout.tsx"), "utf8");
    expect(layout).toContain("/img/icon.svg");
    expect(layout).toContain("/img/apple-touch-icon.png");
    expect(layout).not.toMatch(/icons:[\s\S]{0,300}logo\.png/);
  });
});
