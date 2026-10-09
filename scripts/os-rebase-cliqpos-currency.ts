/**
 * One-time correction: CliqPOS prices are in GHS but were ingested as USD cents.
 * Divides every product:CLIQPOS revenue entry by GHS_PER_USD and recomputes customer MRR.
 * Usage: DATABASE_URL=... npx tsx scripts/os-rebase-cliqpos-currency.ts [--rate=12] [--apply]
 */
import { prisma } from "../src/lib/prisma";
import { audit } from "../src/lib/os/audit";
import { getGhsPerUsd } from "../src/lib/os/fx";
import { mrrCentsAt } from "../src/lib/os/mrr";

const rateArg = process.argv.find((a) => a.startsWith("--rate="))?.split("=")[1];
const apply = process.argv.includes("--apply");

async function main() {
  const rate = rateArg ? Number(rateArg) : (await getGhsPerUsd()).ghsPerUsd;
  if (!(rate > 1)) throw new Error("bad rate");
  const done = await prisma.osAuditLog.findFirst({ where: { action: "revenue.currency_rebased" } });
  if (done) throw new Error("Already applied once (audit entry exists); refusing to divide twice.");
  const entries = await prisma.osRevenueEntry.findMany({ where: { source: "product:CLIQPOS" } });
  const now = new Date();
  const recurring = (xs: typeof entries) => xs.filter((e) => e.kind === "RECURRING");
  const next = entries.map((e) => ({ ...e, amountCents: Math.round(e.amountCents / rate) }));
  const mrrBefore = mrrCentsAt(recurring(entries), now);
  const mrrAfter = mrrCentsAt(recurring(next), now);
  console.log(`entries=${entries.length} rate=${rate}`);
  console.log(`MRR before=$${Math.round(mrrBefore / 100)} ARR before=$${Math.round((mrrBefore * 12) / 100)}`);
  console.log(`MRR after=$${Math.round(mrrAfter / 100)} ARR after=$${Math.round((mrrAfter * 12) / 100)}`);
  if (!apply) return console.log("dry run; pass --apply to write");
  for (const e of next) await prisma.osRevenueEntry.update({ where: { id: e.id }, data: { amountCents: e.amountCents } });
  const custIds = [...new Set(next.map((e) => e.customerId).filter((x): x is number => x != null))];
  for (const id of custIds) {
    await prisma.osCustomer.update({ where: { id }, data: { mrrCents: mrrCentsAt(recurring(next).filter((e) => e.customerId === id), now) } });
  }
  await audit({ actor: "script", actorType: "SYSTEM", action: "revenue.currency_rebased", resource: "revenue_entry", resourceId: "bulk", input: { rate, entries: entries.length, customers: custIds.length } });
  console.log("applied");
}
main().finally(() => prisma.$disconnect());
