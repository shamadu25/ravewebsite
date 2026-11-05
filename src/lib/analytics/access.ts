import { getAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { can, type Permission, type Role } from "@/lib/os/rbac";

export interface PageCaller { name: string; role: Role }

/** Server-side authorisation for Intelligence pages (the /admin proxy only proves a valid login; this proves the right role). */
export async function pageCaller(permission: Permission = "analytics.read"): Promise<PageCaller | null> {
  const session = await getAdminSession();
  if (!session) return null;
  let caller: PageCaller | null = null;
  if (session.email.toLowerCase() === (process.env.ADMIN_EMAIL ?? "").toLowerCase()) caller = { name: session.email, role: "SUPER_ADMIN" };
  else {
    const user = await prisma.osUser.findUnique({ where: { email: session.email.toLowerCase() } });
    if (user?.active) caller = { name: user.email, role: user.role as Role };
  }
  return caller && can(caller.role, permission) ? caller : null;
}
