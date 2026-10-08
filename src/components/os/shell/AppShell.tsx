import { getAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

const titleCase = (s: string) => s.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Fixed dark sidebar + spacious workspace. Name/role come from the signed-in session, never hard-coded. */
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  const email = session?.email ?? "";
  const isEnvAdmin = email.toLowerCase() === (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  const [member, approvals] = await Promise.all([
    isEnvAdmin ? null : prisma.osUser.findUnique({ where: { email: email.toLowerCase() } }).catch(() => null),
    prisma.osApproval.count({ where: { orgId: ORG_ID, status: { in: ["PENDING", "INFO_REQUESTED"] } } }).catch(() => 0),
  ]);
  const name = member?.name ?? titleCase(email.split("@")[0] || "Admin");
  const role = isEnvAdmin ? "CEO / Founder" : titleCase(member?.role ?? "Viewer");

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <Sidebar approvals={approvals} userName={name} userRole={role} />
      <div className="min-w-0 overflow-x-clip md:pl-16 lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <GlobalSearch />
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden h-10 items-center rounded-[12px] border border-[var(--border)] bg-white px-3 text-[13px] text-[var(--muted)] xl:flex" title="Additional workspaces (CliqPOS, KOVABOT, HMS, Restovax) arrive with multi-tenant support">RaveSoft (Internal)</span>
              <NotificationBell />
              <UserMenu name={name} role={role} />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-[1600px] px-4 pb-24 pt-8 sm:px-6 md:pb-12 lg:px-8">{children}</main>
      </div>
      <MobileNav approvals={approvals} />
    </div>
  );
}
