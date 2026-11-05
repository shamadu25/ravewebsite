/** Pure email composition. Every dynamic value is HTML-escaped; subjects are stripped of CR/LF (header-injection safe). */
import { formatMoney } from "../pricing";
import type { ProposalContent } from "../proposal/content";
import type { CompanySettings } from "../settings";

export const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
export const cleanHeader = (v: string) => v.replace(/[\r\n]+/g, " ").trim().slice(0, 300);

export const CUSTOMER_SUBJECT = "Your Personalised AI Business Assessment & Proposal — RaveSoft";
export const internalSubject = (business: string) => cleanHeader(`New AI Automation Opportunity — ${business}`);

export interface EmailTemplate { subject: string; intro?: string; body?: string; outro?: string }
export type TemplateKey = "customer_proposal" | "internal_new_opportunity" | "followup_check_in" | "followup_benefits" | "followup_invite";

export const DEFAULT_TEMPLATES: Record<TemplateKey, EmailTemplate> = {
  customer_proposal: { subject: CUSTOMER_SUBJECT, intro: "Thank you for completing the RaveSoft AI business assessment. We reviewed your answers and prepared the proposal below.", outro: "If anything here does not look right, reply to this email and we will adjust it." },
  internal_new_opportunity: { subject: "New AI Automation Opportunity — {{business}}" },
  followup_check_in: { subject: "Did you get a chance to review your RaveSoft proposal?", body: "I wanted to check whether you have had a chance to look through the proposal we prepared for {{business}}. If you have questions about any of the recommended solutions, reply here and we will answer them." },
  followup_benefits: { subject: "How the recommended AI solutions could help {{business}}", body: "As a reminder, the proposal for {{business}} recommends: {{solutions}}. These were chosen because of the challenges you described. Happy to talk through how each would work day to day." },
  followup_invite: { subject: "Shall we talk through implementation for {{business}}?", body: "Your proposal is still open. If you would like to move forward, or would like to discuss scope, timing or pricing, reply to this email and we will arrange a conversation." },
};

export function fill(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

function shell(company: CompanySettings, inner: string, footer: string): string {
  return `<!doctype html><html><body style="margin:0;background:#F7F9FC;font-family:Arial,Helvetica,sans-serif;color:#172033;">
<div style="max-width:620px;margin:0 auto;padding:24px 16px;">
  <div style="background:#060297;padding:20px 24px;border-radius:8px 8px 0 0;"><div style="color:#FFB200;font-weight:700;letter-spacing:.5px;font-size:13px;">RAVESOFT DIGITAL SOLUTIONS</div></div>
  <div style="background:#fff;padding:24px;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 8px 8px;font-size:14px;line-height:1.6;">${inner}</div>
  <div style="padding:16px 8px;color:#64748B;font-size:12px;line-height:1.5;">${footer}<br>${esc(company.name)} · ${esc(company.location)}</div>
</div></body></html>`;
}
const li = (items: string[]) => `<ul style="padding-left:18px;margin:8px 0;">${items.map((x) => `<li style="margin:4px 0;">${esc(x)}</li>`).join("")}</ul>`;

export interface RenderedEmail { subject: string; html: string; text: string }

export function renderCustomerProposalEmail(c: ProposalContent, o: { link: string; optOutUrl: string; template?: EmailTemplate; approved: boolean }): RenderedEmail {
  const t = { ...DEFAULT_TEMPLATES.customer_proposal, ...o.template };
  const q = c.quote;
  const first = c.customer.contactName.split(/\s+/)[0] || "there";
  const money = q.status === "COMPLETE"
    ? `<p><strong>Initial investment:</strong> ${esc(formatMoney(q.initialTotal, q.currency))}<br><strong>Monthly recurring:</strong> ${esc(formatMoney(q.monthlyTotal, q.currency))}</p>`
    : `<p>Pricing will be confirmed by our team shortly.</p>`;
  const inner = `
<p>Hello ${esc(first)},</p>
<p>${esc(t.intro ?? "")}</p>
<h3 style="margin:18px 0 4px;color:#071536;">Your business</h3><p>${esc(c.executiveSummary)}</p>
<h3 style="margin:18px 0 4px;color:#071536;">Key challenges we identified</h3>${li(c.challenges.slice(0, 6))}
<h3 style="margin:18px 0 4px;color:#071536;">Recommended AI solutions</h3>${li(c.solutions.map((s) => s.name))}
<h3 style="margin:18px 0 4px;color:#071536;">Proposed investment</h3>${money}
<h3 style="margin:18px 0 4px;color:#071536;">Implementation timeline</h3><p>${esc(c.timeline)}</p>
<p style="margin:22px 0;"><a href="${esc(o.link)}" style="background:#FFB200;color:#071536;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:6px;display:inline-block;">View your proposal</a></p>
<p style="color:#64748B;font-size:12px;">The PDF is attached. The link is private to you and expires when the proposal does.</p>
<h3 style="margin:18px 0 4px;color:#071536;">Next steps</h3>${li(["Review the proposal and note any questions", "Reply to this email or contact us to discuss scope, timing and pricing", "To proceed, follow the acceptance instructions in the proposal"])}
<p>${esc(t.outro ?? "")}</p>
<p>${esc(c.company.name)}<br>${esc(c.company.email)} · ${esc(c.company.phone)} · WhatsApp ${esc(c.company.whatsapp)}</p>`;
  const text = `Hello ${first},\n\n${t.intro ?? ""}\n\n${c.executiveSummary}\n\nKey challenges:\n${c.challenges.slice(0, 6).map((x) => `- ${x}`).join("\n")}\n\nRecommended AI solutions:\n${c.solutions.map((s) => `- ${s.name}`).join("\n")}\n\n${q.status === "COMPLETE" ? `Initial investment: ${formatMoney(q.initialTotal, q.currency)}\nMonthly recurring: ${formatMoney(q.monthlyTotal, q.currency)}` : "Pricing will be confirmed by our team shortly."}\n\nTimeline: ${c.timeline}\n\nView your proposal: ${o.link}\n\n${t.outro ?? ""}\n\n${c.company.name}\n${c.company.email} · ${c.company.phone}\n\nDon't want further emails about this proposal? ${o.optOutUrl}`;
  return {
    subject: cleanHeader(fill(t.subject, {})),
    html: shell(c.company, inner, `You are receiving this because you completed an assessment on our website. <a href="${esc(o.optOutUrl)}" style="color:#64748B;">Stop emails about this proposal</a>.`),
    text,
  };
}

export interface InternalEmailInput { business: string; contact: string; position: string; email: string; phone: string; industry: string; employees: string; challenges: string[]; analysisSummary: string; solutions: string[]; initialTotal: string; monthlyTotal: string; approvalStatus: string; priority: string; proposalLink: string; suggestedAction: string; preferredChannel: string; manualReasons: string[] }

export function renderInternalEmail(i: InternalEmailInput, company: CompanySettings): RenderedEmail {
  const row = (k: string, v: string) => `<tr><td style="padding:6px 0;color:#64748B;width:170px;vertical-align:top;">${esc(k)}</td><td style="padding:6px 0;font-weight:600;">${esc(v)}</td></tr>`;
  const inner = `<h2 style="margin:0 0 12px;color:#071536;">${esc(i.business)}</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px;">
${row("Contact", `${i.contact}${i.position ? `, ${i.position}` : ""}`)}${row("Email / phone", `${i.email} / ${i.phone}`)}${row("Preferred channel", i.preferredChannel)}${row("Industry", i.industry)}${row("Business size", i.employees)}${row("Priority", i.priority)}${row("Approval status", i.approvalStatus)}${row("Est. project value", i.initialTotal)}${row("Monthly recurring potential", i.monthlyTotal)}</table>
<h3 style="color:#071536;margin:16px 0 4px;">Challenges</h3>${li(i.challenges)}
<h3 style="color:#071536;margin:16px 0 4px;">AI assessment</h3><p>${esc(i.analysisSummary)}</p>
<h3 style="color:#071536;margin:16px 0 4px;">Recommended solutions</h3>${li(i.solutions)}
${i.manualReasons.length ? `<h3 style="color:#B45309;margin:16px 0 4px;">Needs manual review</h3>${li(i.manualReasons)}` : ""}
<h3 style="color:#071536;margin:16px 0 4px;">Suggested sales action</h3><p>${esc(i.suggestedAction)}</p>
<p><a href="${esc(i.proposalLink)}" style="background:#060297;color:#fff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:6px;display:inline-block;">Open in admin</a></p>`;
  const text = `${i.business}\n${i.contact} (${i.position}) — ${i.email} / ${i.phone}\nIndustry: ${i.industry} | Size: ${i.employees} | Priority: ${i.priority}\nApproval: ${i.approvalStatus}\nEst. project value: ${i.initialTotal} | Monthly: ${i.monthlyTotal}\n\nChallenges:\n${i.challenges.map((x) => `- ${x}`).join("\n")}\n\nAssessment: ${i.analysisSummary}\n\nSolutions:\n${i.solutions.map((x) => `- ${x}`).join("\n")}\n\nSuggested action: ${i.suggestedAction}\n${i.proposalLink}`;
  return { subject: internalSubject(i.business), html: shell(company, inner, "Internal notification — RaveSoft AI Automation"), text };
}

export function renderFollowupEmail(o: { key: TemplateKey; template?: EmailTemplate; business: string; firstName: string; solutions: string[]; link: string; optOutUrl: string; company: CompanySettings }): RenderedEmail {
  const t = { ...DEFAULT_TEMPLATES[o.key], ...o.template };
  const vars = { business: o.business, solutions: o.solutions.join(", "), name: o.firstName };
  const body = fill(t.body ?? "", vars);
  const inner = `<p>Hello ${esc(o.firstName || "there")},</p><p>${esc(body)}</p><p><a href="${esc(o.link)}" style="color:#060297;font-weight:700;">View your proposal</a></p><p>${esc(o.company.name)}<br>${esc(o.company.email)} · ${esc(o.company.phone)}</p>`;
  return {
    subject: cleanHeader(fill(t.subject, vars)),
    html: shell(o.company, inner, `You are receiving this because we sent you a proposal. <a href="${esc(o.optOutUrl)}" style="color:#64748B;">Stop emails about this proposal</a>.`),
    text: `Hello ${o.firstName || "there"},\n\n${body}\n\nView your proposal: ${o.link}\n\n${o.company.name}\n${o.company.email}\n\nStop emails about this proposal: ${o.optOutUrl}`,
  };
}
