import { verifyAdminCredentials } from "@/lib/auth/credentials";

describe("verifyAdminCredentials", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ADMIN_EMAIL: "admin@ravesoftsolutions.com", ADMIN_PASSWORD: "correct-horse" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("accepts the correct email and password", () => {
    expect(verifyAdminCredentials("admin@ravesoftsolutions.com", "correct-horse")).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(verifyAdminCredentials("admin@ravesoftsolutions.com", "wrong")).toBe(false);
  });

  it("rejects a wrong email", () => {
    expect(verifyAdminCredentials("someone-else@example.com", "correct-horse")).toBe(false);
  });

  it("rejects everything when env vars are not configured", () => {
    process.env.ADMIN_EMAIL = "";
    process.env.ADMIN_PASSWORD = "";
    expect(verifyAdminCredentials("", "")).toBe(false);
  });

  it("rejects a password of a different length without throwing", () => {
    expect(() => verifyAdminCredentials("admin@ravesoftsolutions.com", "short")).not.toThrow();
    expect(verifyAdminCredentials("admin@ravesoftsolutions.com", "short")).toBe(false);
  });
});
