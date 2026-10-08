import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { ROLES } from "@/lib/os/rbac";
import ApiButton from "@/components/os/ApiButton";
import ApiForm from "@/components/os/ApiForm";
import { Badge, Card, PageHeader } from "@/components/os/ui";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await prisma.osUser.findMany({ where: { orgId: ORG_ID }, orderBy: { id: "asc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="Team & roles" subtitle="Team members sign in at /admin/login with their own email and password. The environment admin remains SUPER_ADMIN. Only SUPER_ADMIN and CEO can manage users." />
      <Card>
        <ApiForm url="/api/os/users" submitLabel="Add team member" fields={[
          { name: "email", label: "Email", type: "email", required: true }, { name: "name", label: "Name", required: true },
          { name: "role", label: "Role", type: "select", options: ROLES.filter((r) => r !== "SUPER_ADMIN") as unknown as string[] }, { name: "password", label: "Initial password (12+ chars)", required: true },
        ]} />
      </Card>
      <Card>
        <ul className="divide-y divide-gray-100 text-sm">
          {users.map((u) => <li key={u.id} className="flex items-center justify-between gap-3 py-2"><span>{u.name} <span className="text-xs text-gray-500">{u.email}</span> <Badge>{u.active ? "ACTIVE" : "PAUSED"}</Badge> <span className="text-xs text-gray-600">{u.role}</span></span><ApiButton label={u.active ? "Deactivate" : "Reactivate"} method="PATCH" url="/api/os/users" body={{ email: u.email, active: !u.active }} /></li>)}
          {users.length === 0 && <li className="py-2 text-gray-500">No team members yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
