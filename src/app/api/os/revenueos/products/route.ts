import { api, jsonBody } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";
import { ProductInput, seedCatalogue, toRow } from "@/lib/revenueos/catalogue";

export const GET = api("campaign.read", async () => prisma.rvProduct.findMany({ where: { orgId: "ravesoft", deletedAt: null }, orderBy: { name: "asc" } }));

/** Upsert one product. Needs campaign.create (CEO/admin/marketing). */
export const PUT = api("campaign.create", async ({ request, caller }) => {
  const b = await jsonBody(request, ProductInput);
  const row = toRow(b);
  const saved = await prisma.rvProduct.upsert({ where: { orgId_key: { orgId: row.orgId, key: row.key } }, create: row, update: { ...row, deletedAt: null } });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "revenueos.product.save", resource: "rv_product", resourceId: saved.id, input: { key: b.key, availability: b.availability, pricingSet: Boolean(b.pricing) }, ip: caller.ip });
  return saved;
});

/** Seed the starting catalogue (idempotent; never overwrites edits). */
export const POST = api("campaign.create", async ({ caller }) => {
  const r = await seedCatalogue();
  await audit({ actor: caller.name, actorType: "HUMAN", action: "revenueos.catalogue.seed", resource: "rv_product", output: r, ip: caller.ip });
  return r;
});
