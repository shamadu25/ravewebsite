export const ROLES = [
  "SUPER_ADMIN",
  "CEO",
  "EXECUTIVE",
  "MANAGER",
  "SALES",
  "MARKETING",
  "SUPPORT",
  "ENGINEERING",
  "FINANCE",
  "VIEWER",
] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "os.read"
  | "agent.read"
  | "agent.create"
  | "agent.execute"
  | "agent.pause"
  | "agent.configure"
  | "task.read"
  | "approval.read"
  | "approval.decide"
  | "finance.read"
  | "finance.approve"
  | "finance.execute"
  | "customer.read"
  | "customer.update"
  | "opportunity.read"
  | "opportunity.write"
  | "outreach.send"
  | "campaign.read"
  | "campaign.create"
  | "campaign.launch"
  | "deployment.read"
  | "deployment.execute"
  | "brain.read"
  | "brain.write"
  | "goal.write"
  | "audit.read"
  | "commander.run"
  | "commander.command"
  | "user.manage"
  | "report.export";

const READ: Permission[] = [
  "os.read",
  "report.export",
  "agent.read",
  "task.read",
  "approval.read",
  "customer.read",
  "opportunity.read",
  "campaign.read",
  "deployment.read",
  "brain.read",
];

const ROLE_PERMISSIONS: Record<Role, Permission[] | "*"> = {
  SUPER_ADMIN: "*",
  CEO: "*",
  EXECUTIVE: [...READ, "finance.read", "audit.read", "agent.execute", "agent.pause", "approval.decide", "commander.run"],
  MANAGER: [...READ, "agent.execute", "agent.pause", "opportunity.write", "customer.update", "brain.write"],
  SALES: [...READ, "opportunity.write", "outreach.send", "agent.execute"],
  MARKETING: [...READ, "campaign.create", "campaign.launch", "brain.write", "agent.execute"],
  SUPPORT: [...READ, "customer.update", "agent.execute"],
  ENGINEERING: [...READ, "deployment.execute", "agent.configure", "agent.execute"],
  FINANCE: [...READ, "finance.read", "finance.approve", "finance.execute"],
  VIEWER: READ,
};

export function can(role: Role, permission: Permission): boolean {
  const granted = ROLE_PERMISSIONS[role];
  return granted === "*" || granted.includes(permission);
}

/** Rank used to check an approval's requiredRole against the decider's role. */
const ROLE_RANK: Record<Role, number> = {
  SUPER_ADMIN: 100,
  CEO: 90,
  EXECUTIVE: 70,
  MANAGER: 50,
  FINANCE: 40,
  SALES: 30,
  MARKETING: 30,
  ENGINEERING: 30,
  SUPPORT: 20,
  VIEWER: 0,
};

export function meetsRole(actual: Role, required: Role): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}
