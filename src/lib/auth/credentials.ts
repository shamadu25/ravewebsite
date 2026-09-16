import { timingSafeEqual } from "crypto";

/** Constant-time string comparison to avoid leaking password length/content via timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal-length buffers to avoid an early-return timing signal.
    timingSafeEqual(bufA, bufA);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.ADMIN_EMAIL ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!expectedEmail || !expectedPassword) {
    return false;
  }

  return safeEqual(email, expectedEmail) && safeEqual(password, expectedPassword);
}
