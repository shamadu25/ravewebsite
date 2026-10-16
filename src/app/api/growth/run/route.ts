import { growthApi } from "@/lib/growth/api";
import { dispatchDue } from "@/lib/growth/outbox";
import { processGrowthReplies } from "@/lib/growth/replies";

export const maxDuration = 60;
/** Manual "run now" for admins; the scheduler calls the same functions from /api/os/cron. */
export const POST = growthApi("commander.run", async () => ({ replies: await processGrowthReplies(), dispatch: await dispatchDue(5) }));
