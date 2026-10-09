import { Bot, BookOpen, Boxes, ClipboardCheck, Cog, FileBarChart, House, Megaphone, Plug, Settings, Target, Users, Wallet, Workflow, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that keep this item highlighted (sub-pages that belong to it). */
  also?: string[];
  badge?: "approvals";
}

export const NAV: NavItem[] = [
  { href: "/admin", label: "Home", icon: House, also: ["/admin/ask", "/admin/brief", "/admin/search"] },
  { href: "/admin/agents", label: "AI Employees", icon: Bot, also: ["/admin/performance", "/admin/factory"] },
  { href: "/admin/revenue", label: "Leads & Sales", icon: Target, also: ["/admin/leads", "/admin/conversations", "/admin/forecast"] },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/products", label: "Products", icon: Boxes },
  { href: "/admin/finance", label: "Finance", icon: Wallet },
  { href: "/admin/operations", label: "Operations", icon: Cog, also: ["/admin/tasks"] },
  { href: "/admin/workflows", label: "Workflows", icon: Workflow },
  { href: "/admin/brain", label: "Knowledge", icon: BookOpen },
  { href: "/admin/integrations", label: "Integrations", icon: Plug },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart, also: ["/admin/audit"] },
  { href: "/admin/approvals", label: "Approvals", icon: ClipboardCheck, badge: "approvals" },
  { href: "/admin/settings", label: "Settings", icon: Settings, also: ["/admin/goals", "/admin/users", "/admin/models", "/admin/whatsapp"] },
];

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/admin") return pathname === "/admin" || (item.also ?? []).some((p) => pathname.startsWith(p));
  return pathname.startsWith(item.href) || (item.also ?? []).some((p) => pathname.startsWith(p));
}
