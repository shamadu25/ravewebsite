/**
 * Optional Cloudflare Turnstile (free CAPTCHA alternative). Enabled only when BOTH keys are set:
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY (browser) and TURNSTILE_SECRET_KEY (server).
 * With neither set the whole layer is a no-op, so deploying this code changes nothing until you opt in.
 */
export const turnstileEnabled = () => Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export async function verifyTurnstile(token: string | null | undefined, ip: string): Promise<{ ok: boolean; unreachable?: boolean }> {
  if (!turnstileEnabled()) return { ok: true };
  if (!token) return { ok: false };
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY as string, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5_000),
    });
    const json = (await res.json()) as { success?: boolean };
    return { ok: json.success === true };
  } catch (error) {
    // Cloudflare unreachable: fail OPEN (the other layers still apply) rather than block real customers.
    console.error("[antispam] Turnstile verification unreachable", error);
    return { ok: true, unreachable: true };
  }
}
