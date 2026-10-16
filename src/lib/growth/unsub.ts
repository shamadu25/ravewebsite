import { createHmac, timingSafeEqual } from "crypto";
const secret = () => process.env.OS_UNSUBSCRIBE_SECRET ?? process.env.ADMIN_SESSION_SECRET ?? "";
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://ravesoftsolutions.com";
export const signGrowthUnsub = (companyId: number, email: string) => createHmac("sha256", secret()).update(`growth|${companyId}|${email.toLowerCase()}`).digest("hex").slice(0, 32);
export function verifyGrowthUnsub(companyId: number, email: string, token: string): boolean {
  if (!secret() || token.length !== 32) return false;
  return timingSafeEqual(Buffer.from(signGrowthUnsub(companyId, email)), Buffer.from(token));
}
export const growthUnsubUrl = (companyId: number, email: string) => `${APP_URL()}/api/growth/unsubscribe?c=${companyId}&a=${encodeURIComponent(email.toLowerCase())}&t=${signGrowthUnsub(companyId, email)}`;
