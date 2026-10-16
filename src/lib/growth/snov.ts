/**
 * Snov.io client (official API v1 OAuth + v2 task endpoints, per https://snov.io/api).
 * Credentials: SNOV_CLIENT_ID + SNOV_CLIENT_SECRET (server-side env only). Nothing is simulated:
 * without credentials every call throws SnovNotConfiguredError and callers surface "awaiting credentials".
 */
export class SnovNotConfiguredError extends Error {
  constructor() { super("Snov.io is awaiting credentials (set SNOV_CLIENT_ID and SNOV_CLIENT_SECRET)."); this.name = "SnovNotConfiguredError"; }
}
export class SnovError extends Error {
  constructor(message: string, public status: number, public kind: "auth" | "rate_limit" | "quota" | "timeout" | "provider") { super(message); this.name = "SnovError"; }
}

export type ContactStatus = "NOT_RESEARCHED" | "FOUND_UNVERIFIED" | "VERIFIED" | "RISKY" | "INVALID" | "UNAVAILABLE" | "MANUAL_REVIEW";

export interface VerificationResult { email: string; smtpStatus: string; unknownReason?: string; isDisposable?: boolean; isValidFormat?: boolean }

/** Only a provider smtp_status of "valid" (and not disposable) is VERIFIED. catch-all is RISKY; unknown otherwise needs review. */
export function mapVerification(v: VerificationResult): ContactStatus {
  if (v.isValidFormat === false) return "INVALID";
  if (v.smtpStatus === "not_valid") return "INVALID";
  if (v.isDisposable) return "RISKY";
  if (v.smtpStatus === "valid") return "VERIFIED";
  if (v.smtpStatus === "unknown") return v.unknownReason === "catchall" ? "RISKY" : "MANUAL_REVIEW";
  return "MANUAL_REVIEW";
}

type Fetch = typeof fetch;
const BASE = "https://api.snov.io";

export interface SnovOptions { clientId?: string; clientSecret?: string; fetchImpl?: Fetch; sleep?: (ms: number) => Promise<void>; pollAttempts?: number; pollMs?: number }

export class SnovClient {
  private token: { value: string; exp: number } | null = null;
  private f: Fetch; private sleep: (ms: number) => Promise<void>;
  constructor(private o: SnovOptions = {}) {
    this.f = o.fetchImpl ?? fetch;
    this.sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }
  private creds() {
    const id = this.o.clientId ?? process.env.SNOV_CLIENT_ID, secret = this.o.clientSecret ?? process.env.SNOV_CLIENT_SECRET;
    if (!id || !secret) throw new SnovNotConfiguredError();
    return { id, secret };
  }
  isConfigured() { try { this.creds(); return true; } catch { return false; } }

  private async raw(url: string, init: RequestInit): Promise<unknown> {
    let res: Response;
    try { res = await this.f(url, { ...init, signal: AbortSignal.timeout(20_000) }); }
    catch (e) { throw new SnovError(e instanceof Error ? e.message : "network error", 0, "timeout"); }
    if (res.status === 429) throw new SnovError("Snov.io rate limit (60 req/min) reached.", 429, "rate_limit");
    if (res.status === 401 || res.status === 403) { this.token = null; throw new SnovError("Snov.io rejected the credentials.", res.status, "auth"); }
    if (res.status === 402) throw new SnovError("Snov.io credits exhausted.", 402, "quota");
    if (!res.ok) throw new SnovError(`Snov.io error ${res.status}`, res.status, "provider");
    return res.json();
  }

  async accessToken(): Promise<string> {
    if (this.token && this.token.exp > Date.now() + 30_000) return this.token.value;
    const { id, secret } = this.creds();
    const j = (await this.raw(`${BASE}/v1/oauth/access_token`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
    })) as { access_token?: string; expires_in?: number };
    if (!j.access_token) throw new SnovError("Snov.io returned no access token.", 500, "auth");
    this.token = { value: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
    return this.token.value;
  }

  private async authed(path: string, init: RequestInit = {}) {
    const t = await this.accessToken();
    return this.raw(`${BASE}${path}`, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${t}`, "Content-Type": "application/json" } });
  }

  private async poll<T>(path: string, done: (j: T) => boolean): Promise<T> {
    const attempts = this.o.pollAttempts ?? 8, ms = this.o.pollMs ?? 1500;
    for (let i = 0; i < attempts; i++) {
      const j = (await this.authed(path)) as T;
      if (done(j)) return j;
      await this.sleep(ms);
    }
    throw new SnovError("Snov.io task did not complete in time.", 408, "timeout");
  }

  /** Unverified emails known for a domain (1 credit). */
  async domainEmails(domain: string): Promise<string[]> {
    const s = (await this.authed("/v2/domain-search/domain-emails/start", { method: "POST", body: JSON.stringify({ domain }) })) as { meta?: { task_hash?: string } };
    const hash = s.meta?.task_hash;
    if (!hash) throw new SnovError("Snov.io returned no task hash.", 500, "provider");
    const r = await this.poll<{ status?: string; data?: Array<{ email?: string }> }>(`/v2/domain-search/domain-emails/result/${hash}`, (j) => j.status === "completed");
    return (r.data ?? []).map((d) => d.email).filter((e): e is string => !!e);
  }

  /** Find an email for a named person at a domain (1 credit per valid/unknown result). */
  async findEmail(first: string, last: string, domain: string): Promise<{ email: string; verification: VerificationResult } | null> {
    const s = (await this.authed("/v2/emails-by-domain-by-name/start", { method: "POST", body: JSON.stringify({ rows: [{ first_name: first, last_name: last, domain }] }) })) as { data?: { task_hash?: string } };
    const hash = s.data?.task_hash;
    if (!hash) throw new SnovError("Snov.io returned no task hash.", 500, "provider");
    type R = { status?: string; data?: Array<{ result?: Array<{ email?: string; smtp_status?: string; is_valid_format?: boolean; is_disposable?: boolean; unknown_status_reason?: string }> }> };
    const r = await this.poll<R>(`/v2/emails-by-domain-by-name/result?task_hash=${hash}`, (j) => j.status === "completed" || j.status === "not_enough_credits");
    if (r.status === "not_enough_credits") throw new SnovError("Snov.io credits exhausted.", 402, "quota");
    const hit = r.data?.[0]?.result?.find((x) => x.email);
    if (!hit?.email) return null;
    return { email: hit.email, verification: { email: hit.email, smtpStatus: hit.smtp_status ?? "unknown", unknownReason: hit.unknown_status_reason, isDisposable: hit.is_disposable, isValidFormat: hit.is_valid_format } };
  }

  async verify(email: string): Promise<VerificationResult> {
    const s = (await this.authed("/v2/email-verification/start", { method: "POST", body: JSON.stringify({ emails: [email] }) })) as { data?: { task_hash?: string } };
    const hash = s.data?.task_hash;
    if (!hash) throw new SnovError("Snov.io returned no task hash.", 500, "provider");
    type R = { status?: string; data?: Array<{ email?: string; result?: { smtp_status?: string; is_valid_format?: boolean; is_disposable?: boolean; unknown_status_reason?: string } }> };
    const r = await this.poll<R>(`/v2/email-verification/result?task_hash=${hash}`, (j) => j.status === "completed");
    const row = r.data?.find((d) => d.email?.toLowerCase() === email.toLowerCase()) ?? r.data?.[0];
    return { email, smtpStatus: row?.result?.smtp_status ?? "unknown", unknownReason: row?.result?.unknown_status_reason, isDisposable: row?.result?.is_disposable, isValidFormat: row?.result?.is_valid_format };
  }
}
