import { prisma } from "@/lib/prisma";

const KEY = "os.fx.ghs_per_usd";
export const DEFAULT_GHS_PER_USD = 12;

export interface FxRate { ghsPerUsd: number; updatedAt: string | null }

/** Rate used to convert GHS-priced product events (CliqPOS) into USD. Edited daily in Settings. */
export async function getGhsPerUsd(): Promise<FxRate> {
  const row = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  const v = row?.value as { rate?: number } | number | null | undefined;
  const rate = typeof v === "number" ? v : v?.rate;
  return { ghsPerUsd: typeof rate === "number" && rate > 1 ? rate : DEFAULT_GHS_PER_USD, updatedAt: row ? row.updatedAt.toISOString() : null };
}

export async function setGhsPerUsd(rate: number): Promise<void> {
  if (!(rate > 1 && rate < 1000)) throw new Error("Rate must be between 1 and 1000 GHS per USD.");
  await prisma.systemSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: { rate } }, update: { value: { rate } } });
}

export const ghsToUsdCents = (ghsCents: number, ghsPerUsd: number): number => Math.round(ghsCents / ghsPerUsd);
