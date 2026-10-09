import { api } from "@/lib/os/http";
import { pollInbox } from "@/lib/os/inbox";

export const maxDuration = 60;
/** Read-only mailbox check (never modifies the mailbox). Also runs automatically on every scheduler tick. */
export const POST = api("opportunity.write", async () => pollInbox());
