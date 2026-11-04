/** Request-level protections shared by public form endpoints. */

/**
 * CSRF / cross-site posting defence. Browsers always send `Origin` (and `Sec-Fetch-Site`) on fetch POSTs, so a
 * request made from another website is identifiable. Non-browser clients send neither and are allowed through
 * (they are covered by the token, rate-limit and content checks instead). Exact-host comparison, never a prefix.
 */
export function isSameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site" && site !== "none") return false;

  const origin = req.headers.get("origin");
  if (!origin) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const hosts = new Set<string>();
  const add = (v?: string | null) => {
    if (!v) return;
    try {
      hosts.add(new URL(v.includes("://") ? v : `https://${v}`).host.toLowerCase());
    } catch {
      /* ignore malformed env value */
    }
  };
  add(req.headers.get("x-forwarded-host"));
  add(req.headers.get("host"));
  add(process.env.NEXT_PUBLIC_APP_URL);
  add(process.env.VERCEL_URL);
  add(process.env.VERCEL_BRANCH_URL);
  add(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  return hosts.has(originHost);
}

export const MAX_BODY_BYTES = 32 * 1024;

export type BodyResult = { ok: true; body: unknown } | { ok: false; status: 413 | 422 };

/** Reads a JSON body with a hard size cap (checked from the header AND from the bytes actually received). */
export async function readJsonLimited(req: Request, maxBytes = MAX_BODY_BYTES): Promise<BodyResult> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return { ok: false, status: 413 };
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, status: 422 };
  }
  if (Buffer.byteLength(text, "utf8") > maxBytes) return { ok: false, status: 413 };
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, status: 422 };
  }
}
