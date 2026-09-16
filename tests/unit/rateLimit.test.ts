import { isRateLimited } from "@/lib/ai/rateLimit";

describe("isRateLimited", () => {
  it("allows requests under the limit", () => {
    const key = `test-key-${Math.random()}`;

    for (let i = 0; i < 20; i++) {
      expect(isRateLimited(key)).toBe(false);
    }
  });

  it("blocks requests once the limit is exceeded within the window", () => {
    const key = `test-key-${Math.random()}`;

    for (let i = 0; i < 20; i++) {
      isRateLimited(key);
    }

    expect(isRateLimited(key)).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;

    for (let i = 0; i < 20; i++) {
      isRateLimited(keyA);
    }

    expect(isRateLimited(keyA)).toBe(true);
    expect(isRateLimited(keyB)).toBe(false);
  });
});
