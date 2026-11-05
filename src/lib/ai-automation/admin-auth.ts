import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { can, type Permission, type Role } from "@/lib/os/rbac";

export interface AdminUser { name: string; role: Role }

/** Server Component guard. The proxy already requires a session; this adds per-permission checks and deactivated-user handling. */
export async function requireAdmin(permission: Permission = "ai.read"): Promise<{ user: AdminUser; allowed: boolean }> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const email = session.email.toLowerCase();
  let user: AdminUser | null = null;
  if (email === (process.env.ADMIN_EMAIL ?? "").toLowerCase()) user = { name: session.email, role: "SUPER_ADMIN" };
  else {
    const u = await prisma.osUser.findUnique({ where: { email } }).catch(() => null);
    if (u?.active) user = { name: u.email, role: u.role as Role };
  }
  if (!user) redirect("/admin/login");
  return { user, allowed: can(user.role, permission) };
}
