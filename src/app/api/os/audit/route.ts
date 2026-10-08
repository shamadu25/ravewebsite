import { api } from "@/lib/os/http";
import { verifyAuditChain } from "@/lib/os/audit";

export const GET = api("audit.read", async () => verifyAuditChain());
