import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { verifyUnsubscribe } from "@/lib/os/email-utils";
import { logActivity, setStage } from "@/lib/os/crm";
import { audit } from "@/lib/os/audit";
import { isRateLimited } from "@/lib/ai/rateLimit";

const page = (title: string, body: string, form?: string) =>
  new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 20px;color:#111827"><h1 style="font-size:22px">${title}</h1><p style="color:#64748b;line-height:1.5">${body}</p>${form ?? ""}</body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

function params(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const o = Number(sp.get("o")), a = (sp.get("a") ?? "").toLowerCase(), t = sp.get("t") ?? "";
  return { o, a, t, ok: Number.isInteger(o) && o > 0 && a.includes("@") && verifyUnsubscribe(o, a, t) };
}

/** GET only shows a confirmation button — link scanners that prefetch URLs must never unsubscribe anyone. */
export async function GET(request: NextRequest) {
  const { ok } = params(request);
  if (!ok) return page("Link not valid", "This unsubscribe link is invalid or has expired. Reply to the email with the word “unsubscribe” and we will remove you.");
  return page("Unsubscribe", "Confirm that you no longer want to receive emails from RaveSoft.", `<form method="POST"><button style="background:#6d28d9;color:#fff;border:0;border-radius:10px;padding:12px 20px;font-size:15px;cursor:pointer">Yes, unsubscribe me</button></form>`);
}

/** POST performs the opt-out (also the target of the mail client's one-click List-Unsubscribe button). */
export async function POST(request: NextRequest) {
  if (isRateLimited(`unsub:${request.headers.get("x-forwarded-for") ?? "?"}`)) return page("Too many requests", "Please try again in a minute.");
  const { o, a, ok } = params(request);
  if (!ok) return page("Link not valid", "This unsubscribe link is invalid or has expired. Reply to the email with the word “unsubscribe” and we will remove you.");
  await prisma.osOptOut.upsert({ where: { orgId_channel_address: { orgId: ORG_ID, channel: "EMAIL", address: a } }, create: { orgId: ORG_ID, channel: "EMAIL", address: a, reason: "unsubscribe link" }, update: {} });
  const actor = { actor: "recipient", actorType: "WEBHOOK" as const };
  const opp = await prisma.osOpportunity.findFirst({ where: { id: o, orgId: ORG_ID } });
  if (opp && !["WON", "LOST"].includes(opp.stage)) await setStage(o, "NURTURE", actor, "unsubscribed");
  if (opp) await logActivity(o, actor, "OPT_OUT", "Recipient unsubscribed via the email link.", "EMAIL");
  await audit({ ...actor, action: "optout.unsubscribe_link", resource: "opt_out", resourceId: a });
  return page("You're unsubscribed", "You will not receive further emails from us. Sorry to see you go.");
}
