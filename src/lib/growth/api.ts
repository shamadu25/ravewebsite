import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/os/http";
import type { Permission } from "@/lib/os/rbac";
import type { Caller } from "@/lib/os/http";
import { growthEnabled } from "./config";

/** Same auth/RBAC/rate-limit/audit wrapper as the OS API, plus the Growth feature flag. */
export function growthApi<P = Record<string, never>>(permission: Permission, fn: (a: { request: NextRequest; caller: Caller; params: P }) => Promise<unknown>) {
  const inner = api<P>(permission, fn);
  return async (request: NextRequest, ctx: { params: Promise<P> }): Promise<NextResponse> => {
    if (!growthEnabled()) return NextResponse.json({ ok: false, error: "Growth Engine is disabled (GROWTH_ENGINE_ENABLED)." }, { status: 404 });
    return inner(request, ctx);
  };
}
