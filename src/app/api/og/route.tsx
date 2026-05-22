import { NextRequest } from "next/server";

// Use nodejs runtime — avoids edge runtime loading @vercel/og native Rust/WASM
// bindings that exhaust OS thread limits on constrained shared hosting.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const base = new URL(req.url).origin;
  return Response.redirect(`${base}/img/ravesoft-team.png`, 301);
}
