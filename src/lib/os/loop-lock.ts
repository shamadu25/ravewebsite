import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";

/** Lets every open tab show "Operating loop running…" truthfully. */
const LOCK_KEY = `os:${ORG_ID}:loop_running_since`;
export async function loopRunningSince(): Promise<Date | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key: LOCK_KEY } });
  const v = typeof row?.value === "string" ? new Date(row.value) : null;
  return v && Date.now() - v.getTime() < 5 * 60_000 ? v : null; // stale after 5 min
}
export async function setLoopLock(on: boolean) {
  await prisma.systemSetting.upsert({ where: { key: LOCK_KEY }, create: { key: LOCK_KEY, value: on ? new Date().toISOString() : "" }, update: { value: on ? new Date().toISOString() : "" } });
}
