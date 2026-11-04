import { NextRequest } from "next/server";

/**
 * Best-effort client IP for rate limiting.
 *
 * `X-Forwarded-For` is "client, proxy1, proxy2…". Every proxy APPENDS the address it saw, so only the
 * entries added by proxies you trust can be believed — the left-most value is whatever the client sent.
 * On Vercel (VERCEL env set) the platform headers are used and no configuration is needed. Elsewhere set TRUSTED_PROXY_HOPS to the number of proxies in front of the app (e.g. 1 for a single Apache/Nginx
 * reverse proxy, 2 for Cloudflare + Apache) and the correct entry is used. Unset keeps the legacy
 * behaviour (left-most) so rate limiting is not accidentally shared between all visitors.
 */
export function clientIp(request: NextRequest): string {
  // On Vercel the platform edge sets these headers itself, so they are the real client address and cannot be
  // chosen by the visitor. (VERCEL=1 is set automatically in Vercel deployments.)
  if (process.env.VERCEL) {
    const v = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-real-ip");
    if (v) return v.split(",")[0].trim();
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 0);
    if (parts.length > 0) {
      if (Number.isInteger(hops) && hops > 0) return parts[Math.max(0, parts.length - hops)];
      return parts[0];
    }
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
