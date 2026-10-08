import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { audit } from "./audit";
import { prisma } from "@/lib/prisma";
import { can, type Permission, type Role } from "./rbac";
import "./runtime"; // registers approval executors

export interface Caller {
  name: string;
  role: Role;
  ip: string | null;
}

/** Single admin identity today (env-based login) maps to SUPER_ADMIN; the RBAC layer is already per-permission. */
export async function getCaller(request: Request): Promise<Caller | null> {
  const session = await getAdminSession();
  if (!session) return null;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (session.email.toLowerCase() === (process.env.ADMIN_EMAIL ?? "").toLowerCase()) return { name: session.email, role: "SUPER_ADMIN", ip };
  const user = await prisma.osUser.findUnique({ where: { email: session.email.toLowerCase() } });
  if (!user || !user.active) return null; // deactivated users lose access immediately, even with a valid cookie
  return { name: user.email, role: user.role as Role, ip };
}

type Ctx<P> = { params: Promise<P> };

export function api<P = Record<string, never>>(permission: Permission, fn: (a: { request: NextRequest; caller: Caller; params: P }) => Promise<unknown>) {
  return async (request: NextRequest, ctx: Ctx<P>): Promise<NextResponse> => {
    const caller = await getCaller(request);
    if (!caller) return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
    if (!can(caller.role, permission)) {
      await audit({ actor: caller.name, actorType: "HUMAN", action: "access.denied", resource: "api", resourceId: permission, result: "DENIED", ip: caller.ip });
      return NextResponse.json({ error: `Missing permission ${permission}.` }, { status: 403 });
    }
    if (request.method !== "GET" && isRateLimited(`os:${caller.name}`)) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    try {
      const params = await ctx.params;
      const data = await fn({ request, caller, params });
      return NextResponse.json({ ok: true, data });
    } catch (e) {
      if (e instanceof ZodError) return NextResponse.json({ ok: false, error: "Invalid request.", issues: z.treeifyError(e) }, { status: 422 });
      const message = e instanceof Error ? e.message : "Unexpected error.";
      const status = /denied|requires .* or higher/i.test(message) ? 403 : /not found|No record/i.test(message) ? 404 : 400;
      console.error("[os.api]", request.method, request.nextUrl.pathname, message);
      return NextResponse.json({ ok: false, error: message }, { status });
    }
  };
}

export async function jsonBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  return schema.parse(await request.json().catch(() => ({})));
}
