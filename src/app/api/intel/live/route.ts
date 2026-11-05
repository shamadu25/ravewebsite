import { api } from "@/lib/os/http";
import { liveSessions, liveCount } from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";

/** Polled every ~10 s by the Live Visitors page: one indexed range query on analytics_sessions.last_activity_at. */
export const GET = api("analytics.read", async () => ({ count: await liveCount(), sessions: await liveSessions(100), at: new Date().toISOString() }));
