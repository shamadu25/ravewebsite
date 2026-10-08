import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { ROLES } from "@/lib/os/rbac";
import { hashPassword } from "@/lib/os/users";
import { audit } from "@/lib/os/audit";

export const GET = api("user.manage", async () => (await prisma.osUser.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "asc" } })).map(({ passwordHash: _p, ...u }) => (void _p, u)));

export const POST = api("user.manage", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({ email: z.string().email(), name: z.string().min(2).max(120), role: z.enum(ROLES), password: z.string().min(12).max(200) }));
  if (b.role === "SUPER_ADMIN") throw new Error("SUPER_ADMIN is reserved for the environment admin.");
  const u = await prisma.osUser.create({ data: { orgId: ORG_ID, email: b.email.toLowerCase(), name: b.name, role: b.role, passwordHash: await hashPassword(b.password) } });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "user.create", resource: "user", resourceId: u.email, input: { role: b.role }, ip: caller.ip });
  return { id: u.id, email: u.email, role: u.role };
});

export const PATCH = api("user.manage", async ({ request, caller }) => {
  const b = await jsonBody(request, z.object({ email: z.string().email(), active: z.boolean().optional(), role: z.enum(ROLES).optional() }));
  if (b.role === "SUPER_ADMIN") throw new Error("SUPER_ADMIN is reserved for the environment admin.");
  await prisma.osUser.update({ where: { email: b.email.toLowerCase() }, data: { ...(b.active != null ? { active: b.active } : {}), ...(b.role ? { role: b.role } : {}) } });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "user.update", resource: "user", resourceId: b.email, input: b, ip: caller.ip });
  return { ok: true };
});
