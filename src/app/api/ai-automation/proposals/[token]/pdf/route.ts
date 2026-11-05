import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/ai-automation/tokens";
import { getPdf } from "@/lib/ai-automation/proposal/service";
import { prisma } from "@/lib/prisma";

/** Customer download via the private signed link. Only released (approved/sent) proposals are served — never drafts. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const t = verifyToken(token, "proposal");
  if (!t) return new NextResponse("Link invalid or expired.", { status: 404 });
  const p = await prisma.aiProposal.findUnique({ where: { id: t.id } });
  if (!p || !["APPROVED", "SENT", "ACCEPTED"].includes(p.status)) return new NextResponse("Not found.", { status: 404 });
  const pdf = await getPdf(p.id);
  if (!pdf) return new NextResponse("Not found.", { status: 404 });
  return new NextResponse(new Uint8Array(pdf.pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${pdf.ref}.pdf"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
