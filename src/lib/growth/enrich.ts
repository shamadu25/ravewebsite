import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/os/audit";
import { GROWTH_ORG } from "./config";
import { SnovClient, SnovError, SnovNotConfiguredError, mapVerification, type ContactStatus } from "./snov";

const client = () => new SnovClient();
export const snovStatus = () => ({ configured: client().isConfigured(), reason: client().isConfigured() ? null : "Awaiting credentials (SNOV_CLIENT_ID, SNOV_CLIENT_SECRET)." });

async function usage(operation: string, ok: boolean, credits: number, detail?: string) {
  await prisma.grProviderUsage.create({ data: { provider: "snov", operation, ok, credits, detail: detail?.slice(0, 500) ?? null } });
}

/** A person with a sourced identity is required first: we never email-hunt for unidentified people. */
export async function addPerson(o: { companyId: number; name: string; role: string; sourceUrl: string; verified?: boolean; actor: string }) {
  if (!o.sourceUrl.trim()) throw new Error("A source URL is required for every decision-maker.");
  const p = await prisma.grPerson.create({ data: { companyId: o.companyId, name: o.name.trim(), role: o.role.trim(), sourceUrl: o.sourceUrl.trim(), verified: !!o.verified, confidence: o.verified ? 0.9 : 0.5 } });
  await audit({ actor: o.actor, actorType: "HUMAN", action: "growth.person.add", resource: "growth_person", resourceId: p.id });
  return p;
}

export interface EnrichOutcome { status: ContactStatus | "NOT_CONFIGURED" | "ERROR"; contactId?: number; message: string }

export async function enrichPerson(personId: number, actor: string, c: SnovClient = client()): Promise<EnrichOutcome> {
  const person = await prisma.grPerson.findUniqueOrThrow({ where: { id: personId }, include: { company: true, contacts: true } });
  // Cache: never pay twice for the same person.
  const cached = person.contacts[0];
  if (cached) return { status: cached.status as ContactStatus, contactId: cached.id, message: "Cached result; no provider call made." };
  if (!person.verified) return { status: "MANUAL_REVIEW", message: "Decision-maker is not verified; enrich only after a human confirms the identity." };
  const parts = person.name.trim().split(/\s+/);
  if (parts.length < 2) return { status: "MANUAL_REVIEW", message: "Need first and last name." };
  try {
    const found = await c.findEmail(parts[0], parts.slice(1).join(" "), person.company.domain);
    await usage("find_email", true, found ? 1 : 0);
    if (!found) return { status: "UNAVAILABLE", message: "Snov.io found no email for this person." };
    const status = mapVerification(found.verification);
    // Double-check with the dedicated verifier unless the finder already returned a decisive answer.
    let final = status, raw: unknown = found.verification;
    if (status === "MANUAL_REVIEW") {
      const v = await c.verify(found.email); await usage("verify", true, 1); final = mapVerification(v); raw = v;
    }
    const dupe = await prisma.grContact.findUnique({ where: { orgId_email: { orgId: GROWTH_ORG, email: found.email.toLowerCase() } } });
    const contact = dupe ?? await prisma.grContact.create({ data: { orgId: GROWTH_ORG, companyId: person.companyId, personId: person.id, email: found.email.toLowerCase(), status: final, provider: "snov", providerRaw: raw as never, checkedAt: new Date() } });
    await audit({ actor, actorType: "HUMAN", action: "growth.contact.enrich", resource: "growth_contact", resourceId: contact.id, output: { status: final } });
    return { status: contact.status as ContactStatus, contactId: contact.id, message: final === "VERIFIED" ? "Provider-verified." : `Provider status: ${final}.` };
  } catch (e) {
    if (e instanceof SnovNotConfiguredError) return { status: "NOT_CONFIGURED", message: e.message };
    const msg = e instanceof SnovError ? `${e.kind}: ${e.message}` : e instanceof Error ? e.message : "error";
    await usage("find_email", false, 0, msg);
    return { status: "ERROR", message: msg };
  }
}
