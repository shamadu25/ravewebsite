import { resolveTxt } from "dns/promises";

export interface DnsCheck { label: string; ok: boolean | null; detail: string }

const txt = async (name: string): Promise<string[]> => {
  try { return (await Promise.race([resolveTxt(name), new Promise<string[][]>((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000))])).map((r) => r.join("")); } catch { return []; }
};

/** Deliverability basics for the sending domain. SPF/DMARC are definitive; DKIM only checks common selector names, so "not found" is inconclusive. */
export async function emailDnsReport(domain: string, smtpHost?: string): Promise<DnsCheck[]> {
  const [root, dmarc, ...dkim] = await Promise.all([
    txt(domain), txt(`_dmarc.${domain}`),
    ...["default", "mail", "dkim", "selector1", "selector2", "google", "k1", "s1"].map((s) => txt(`${s}._domainkey.${domain}`).then((r) => (r.some((x) => /v=DKIM1|p=/.test(x)) ? s : null))),
  ]);
  const spf = root.find((r) => r.toLowerCase().startsWith("v=spf1"));
  const dk = dkim.filter(Boolean) as string[];
  const hostRoot = smtpHost?.split(".").slice(-2).join(".");
  return [
    { label: "SPF", ok: !!spf, detail: spf ? (hostRoot && !spf.includes(hostRoot) && !/include:|\ba\b|\bmx\b/.test(spf) ? `${spf} — does not obviously authorise ${smtpHost}` : spf) : `No SPF record on ${domain}. Add one that authorises your mail server, or mail will often land in spam.` },
    { label: "DMARC", ok: dmarc.some((r) => r.toLowerCase().startsWith("v=dmarc1")), detail: dmarc[0] ?? `No DMARC record at _dmarc.${domain}. Add at least "v=DMARC1; p=none; rua=mailto:you@${domain}".` },
    { label: "DKIM", ok: dk.length ? true : null, detail: dk.length ? `Found selector: ${dk.join(", ")}` : "No DKIM key found under common selector names — inconclusive. Check your hosting panel's email authentication settings." },
  ];
}
