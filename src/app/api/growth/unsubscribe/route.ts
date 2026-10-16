import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { suppress } from "@/lib/growth/suppression";
import { verifyGrowthUnsub } from "@/lib/growth/unsub";
import { audit } from "@/lib/os/audit";
import { isRateLimited } from "@/lib/ai/rateLimit";

const page = (t: string, b: string, f = "") => new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t}</title><body style="font-family:system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 20px"><h1 style="font-size:22px">${t}</h1><p style="color:#64748b">${b}</p>${f}</body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
const parse = (r: NextRequest) => { const sp = r.nextUrl.searchParams; const c = Number(sp.get("c")), a = (sp.get("a") ?? "").toLowerCase(); return { c, a, ok: Number.isInteger(c) && a.includes("@") && verifyGrowthUnsub(c, a, sp.get("t") ?? "") }; };

// GET only confirms: link scanners must never unsubscribe anyone. POST (also mail-client one-click) performs it.
export async function GET(r: NextRequest) {
  return parse(r).ok ? page("Unsubscribe", "Confirm you no longer want emails from us.", `<form method="POST"><button style="background:#6d28d9;color:#fff;border:0;border-radius:10px;padding:12px 20px;font-size:15px">Yes, unsubscribe me</button></form>`) : page("Link not valid", "Reply to the email with “unsubscribe” and we will remove you.");
}
export async function POST(r: NextRequest) {
  if (isRateLimited(`gunsub:${r.headers.get("x-forwarded-for") ?? "?"}`)) return page("Too many requests", "Try again shortly.");
  const { c, a, ok } = parse(r);
  if (!ok) return page("Link not valid", "Reply to the email with “unsubscribe” and we will remove you.");
  await suppress("EMAIL", a, "unsubscribe link", "recipient");
  await prisma.grCompany.updateMany({ where: { id: c }, data: { outreachDisabled: true } });
  await audit({ actor: "recipient", actorType: "WEBHOOK", action: "growth.unsubscribe", resource: "growth_company", resourceId: c });
  return page("You're unsubscribed", "You will not receive further emails from us.");
}
