import { NextRequest, NextResponse } from "next/server";
import { getCaller } from "@/lib/os/http";
import { can } from "@/lib/os/rbac";
import { getPdf } from "@/lib/ai-automation/proposal/service";

/** Staff download of any version (including drafts). Authenticated + permission-checked; never publicly cached. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCaller(request);
  if (!caller) return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  if (!can(caller.role, "ai.read")) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await ctx.params;
  const v = request.nextUrl.searchParams.get("version");
  const pdf = await getPdf(Number(id), v ? Number(v) : undefined);
  if (!pdf) return NextResponse.json({ error: "PDF not generated yet." }, { status: 404 });
  return new NextResponse(new Uint8Array(pdf.pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${pdf.ref}${v ? `-v${v}` : ""}.pdf"`, "Cache-Control": "private, no-store" } });
}
