"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Command Center" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/agents", label: "Agents" },
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/marketing", label: "Marketing" },
  { href: "/admin/forecast", label: "Forecast" },
  { href: "/admin/performance", label: "Performance" },
  { href: "/admin/workflows", label: "Workflows" },
  { href: "/admin/factory", label: "Factory" },
  { href: "/admin/brief", label: "Brief" },
  { href: "/admin/ask", label: "Ask AI" },
  { href: "/admin/brain", label: "Brain" },
  { href: "/admin/goals", label: "Goals" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/users", label: "Team" },
  { href: "/admin/search", label: "Search" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/conversations", label: "Conversations" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
      {LINKS.map((link) => {
        const isActive = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
