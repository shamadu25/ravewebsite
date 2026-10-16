import { prisma } from "@/lib/prisma";
import { GROWTH_ORG } from "./config";

export interface Cadence { followUpDays: number[]; maxTouches: number; approvalTtlHours: number; dailyCap: number; perDomainPerDay: number; hourlyCap: number; minGapMinutes: number }
export const DEFAULT_CADENCE: Cadence = { followUpDays: [4, 7], maxTouches: 3, approvalTtlHours: 72, dailyCap: 25, perDomainPerDay: 1, hourlyCap: 6, minGapMinutes: 5 };

const KEY = `growth:${GROWTH_ORG}:cadence`;
export async function getCadence(): Promise<Cadence> {
  const row = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  const v = (row?.value ?? {}) as Partial<Cadence>;
  return { ...DEFAULT_CADENCE, ...v, dailyCap: Math.min(v.dailyCap ?? DEFAULT_CADENCE.dailyCap, Number(process.env.OS_EMAIL_DAILY_CAP ?? 40)) };
}
export async function setCadence(c: Partial<Cadence>) {
  const next = { ...(await getCadence()), ...c };
  await prisma.systemSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: next as never }, update: { value: next as never } });
  return next;
}
