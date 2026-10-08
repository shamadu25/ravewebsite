import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminCredentials } from "@/lib/auth/credentials";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/session";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { authenticateOsUser } from "@/lib/os/users";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`admin-login:${ip}`)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const { email, password } = parsed.data;

  let sessionEmail = email;
  if (!verifyAdminCredentials(email, password)) {
    // Fall back to team members created in the OS Users page (individual roles).
    const member = await authenticateOsUser(email, password).catch(() => null);
    if (!member) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    sessionEmail = member.email;
  }

  const token = await createSessionToken({ email: sessionEmail });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
