import { lookup } from "dns/promises";
import net from "net";
import type { ProspectSignals } from "./scoring";

/** Block loopback / private / link-local targets so agents cannot be steered at internal services (SSRF). */
export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    return l === "::1" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80") || l.startsWith("::ffff:127.") || l === "::";
  }
  return true;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http(s) URLs are allowed.");
  const addrs = await lookup(url.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new Error("URL resolves to a non-public address.");
  return url;
}

export interface WebsiteAnalysis {
  url: string;
  reachable: boolean;
  title: string | null;
  description: string | null;
  signals: Partial<ProspectSignals>;
  emails: string[];
  phones: string[];
  textExcerpt: string;
  error?: string;
}

/** Pure HTML → signals extraction (testable without network). */
export function analyseHtml(html: string): Pick<WebsiteAnalysis, "title" | "description" | "signals" | "emails" | "phones" | "textExcerpt"> {
  const lower = html.toLowerCase();
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() || null;
  const description = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1]?.trim() || null;
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const emails = [...new Set(html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [])].filter((e) => !/\.(png|jpg|svg|webp)$/i.test(e)).slice(0, 5);
  const phones = [...new Set(html.match(/\+?\d[\d\s().-]{8,16}\d/g) ?? [])].slice(0, 5);

  const chat = /(tawk\.to|intercom|crisp\.chat|livechat|drift\.com|tidio|zendesk|hubspot.*conversations|manychat)/i.test(lower);
  const signals: Partial<ProspectSignals> = {
    bookingFlow: /(book (an )?appointment|book online|book now|schedule (a )?(visit|appointment)|reserve|reservation|calendly\.com)/i.test(lower),
    whatsappContact: /(wa\.me|api\.whatsapp\.com|whatsapp)/i.test(lower),
    contactForm: /<form[\s\S]{0,2000}(email|message|enquiry|inquiry)/i.test(html),
    liveChatPresent: chat,
    hiringReceptionist: /(receptionist|front desk|customer service (agent|representative)).{0,80}(vacancy|hiring|apply|careers|join)/i.test(lower) || /(vacancy|hiring|we are looking).{0,80}receptionist/i.test(lower),
    multiLocation: /(our (branches|locations)|find a (branch|location)|multiple locations)/i.test(lower),
    hasEmail: emails.length > 0,
    hasPhone: phones.length > 0,
  };
  signals.phoneOnly = !!signals.hasPhone && !signals.contactForm && !signals.whatsappContact && !signals.liveChatPresent;
  signals.manualEnquiryProcess = !signals.liveChatPresent && (!!signals.contactForm || !!signals.phoneOnly);
  return { title, description, signals, emails, phones, textExcerpt: text.slice(0, 1500) };
}

export async function analyseWebsite(rawUrl: string): Promise<WebsiteAnalysis> {
  try {
    const url = await assertPublicUrl(rawUrl);
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "RaveSoftBot/1.0 (+https://ravesoftsolutions.com)" } });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (loc) {
        const next = new URL(loc, url);
        await assertPublicUrl(next.toString());
        const res2 = await fetch(next, { redirect: "error", signal: AbortSignal.timeout(8000) });
        return finish(url.toString(), res2.ok, await res2.text());
      }
    }
    return finish(url.toString(), res.ok, await res.text());
  } catch (error) {
    return { url: rawUrl, reachable: false, title: null, description: null, signals: { hasWebsite: true, websiteReachable: false }, emails: [], phones: [], textExcerpt: "", error: error instanceof Error ? error.message : "fetch failed" };
  }
}

function finish(url: string, ok: boolean, html: string): WebsiteAnalysis {
  const a = analyseHtml(html.slice(0, 500_000));
  return { url, reachable: ok, ...a, signals: { ...a.signals, hasWebsite: true, websiteReachable: ok } };
}
