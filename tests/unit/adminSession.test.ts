/**
 * @jest-environment node
 */
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

describe("admin session tokens", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ADMIN_SESSION_SECRET: "test-secret-at-least-32-bytes-long!" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("round-trips a valid token", async () => {
    const token = await createSessionToken({ email: "admin@ravesoftsolutions.com" });
    const session = await verifySessionToken(token);

    expect(session?.email).toBe("admin@ravesoftsolutions.com");
  });

  it("rejects a garbage token", async () => {
    const session = await verifySessionToken("not-a-real-token");
    expect(session).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken({ email: "admin@ravesoftsolutions.com" });
    process.env.ADMIN_SESSION_SECRET = "a-completely-different-secret-value";
    const session = await verifySessionToken(token);
    expect(session).toBeNull();
  });
});
