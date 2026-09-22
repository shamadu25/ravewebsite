/**
 * Plain data, no "use client" — the single source of truth for the agent
 * count. It must stay import-safe from Server Components (metadata, etc.);
 * importing it from ApexWorld.tsx (a "use client" module) instead silently
 * resolves to an empty array there, since Next.js swaps a client module's
 * exports for stubs when a Server Component imports it.
 *
 * Mirrors the ROSTER in ReasoningWeb.jsx (a verbatim copy from the Apex app,
 * so it is not edited there) — keep in sync if the copy's roster changes.
 */
export const ROSTER: { key: string; name: string; color: string }[] = [
  { key: "chief_of_staff", name: "Chief of staff", color: "#00e5ff" },
  { key: "memory",         name: "Memory",         color: "#00e5ff" },
  { key: "strategist",     name: "Strategist",     color: "#00e5ff" },
  { key: "researcher",     name: "Researcher",     color: "#00e5ff" },
  { key: "finance",        name: "Finance",        color: "#00e5ff" },
  { key: "editor",         name: "Editor",         color: "#00e5ff" },
  { key: "sales",          name: "Sales",          color: "#f5a623" },
  { key: "marketing",      name: "Marketing",      color: "#f5a623" },
  { key: "ops",            name: "Ops",            color: "#f5a623" },
  { key: "social_media",   name: "Social",         color: "#f5a623" },
  { key: "engineering",    name: "Engineering",    color: "#f5a623" },
  { key: "design",         name: "Design",         color: "#f5a623" },
  { key: "developer",      name: "Developer",      color: "#f5a623" },
  { key: "analytics",      name: "Analytics",      color: "#7f9bb3" },
  { key: "crm",            name: "CRM",            color: "#7f9bb3" },
  { key: "calendar",       name: "Calendar",       color: "#7f9bb3" },
  { key: "email",          name: "Email",          color: "#7f9bb3" },
  { key: "drive",          name: "Drive",          color: "#7f9bb3" },
  { key: "product",          name: "Product",          color: "#00e5ff" },
  { key: "security",         name: "Security",         color: "#00e5ff" },
  { key: "legal",            name: "Legal",            color: "#00e5ff" },
  { key: "devops",           name: "DevOps",           color: "#f5a623" },
  { key: "qa",               name: "QA",               color: "#f5a623" },
  { key: "customer_success", name: "Success",          color: "#f5a623" },
  { key: "dataml",           name: "Data/ML",          color: "#f5a623" },
  { key: "bizdev",           name: "BizDev",           color: "#f5a623" },
  { key: "hr",               name: "HR",               color: "#7f9bb3" },
];
