import { prisma } from "@/lib/prisma";
import { ORG_ID } from "./constants";
import { createOpportunity, logActivity, setStage } from "./crm";
import { enqueueTask } from "./queue";
import { audit } from "./audit";

/** Where prospects book a call. Tagged so bookings can be attributed to outreach. */
export const bookingUrl = (campaign = "outreach") => `${process.env.OS_BOOKING_URL ?? "https://calendly.com/ravesoftsolutions23"}?utm_source=ravesoft_os&utm_medium=email&utm_campaign=${campaign}`;

const EARLY = ["NEW", "RESEARCHED", "CONTACTED", "ENGAGED", "QUALIFIED", "NURTURE"];

/**
 * A prospect booked (or cancelled) a demo/consultation in Calendly. Find or create the deal, move it to DEMO, stop the
 * cold follow-up sequence (they are already talking to us) and make sure someone prepares. Never throws into the webhook.
 */
export async function handleDemoBooking(e: { email: string; name?: string; canceled: boolean; rescheduled?: boolean }): Promise<{ opportunityId: number | null; note: string }> {
  const actor = { actor: "calendly", actorType: "WEBHOOK" as const };
  const email = e.email.trim().toLowerCase();
  let opp = await prisma.osOpportunity.findFirst({ where: { orgId: ORG_ID, contactEmail: email }, orderBy: { id: "desc" } });

  if (e.canceled) {
    if (!opp) return { opportunityId: null, note: "Cancellation for an unknown contact — nothing to update." };
    await logActivity(opp.id, actor, "DEMO_CANCELED", "Demo/consultation was cancelled in Calendly.", "EMAIL");
    await prisma.osOpportunity.update({ where: { id: opp.id }, data: { nextAction: "Demo cancelled — reach out to rebook" } });
    return { opportunityId: opp.id, note: "Cancellation recorded." };
  }

  let created = false;
  if (!opp) {
    const r = await createOpportunity({ companyName: e.name?.trim() || email, contactName: e.name?.trim() || null, contactEmail: email, businessUnit: "KOVABOT", source: "calendly_booking" }, actor);
    opp = r.opportunity; created = r.created;
  }
  if (EARLY.includes(opp.stage)) await setStage(opp.id, "DEMO", actor, e.rescheduled ? "demo rescheduled" : "booked a demo");
  await prisma.osOpportunity.update({ where: { id: opp.id }, data: { nextFollowUpAt: null, nextAction: "Prepare and hold the demo", lastContactAt: new Date() } });
  await logActivity(opp.id, actor, "DEMO_BOOKED", e.rescheduled ? "Demo/consultation rescheduled in Calendly." : "Prospect booked a demo/consultation in Calendly.", "EMAIL");
  if (created) await enqueueTask({ agentKey: "prospecting-agent", title: `Research ${opp.companyName}`, input: { opportunityId: opp.id }, createdBy: "calendly", priority: "HIGH", idempotencyKey: `research:${opp.id}`, opportunityId: opp.id });
  await audit({ ...actor, action: "demo.booked", resource: "opportunity", resourceId: opp.id, output: { created, rescheduled: !!e.rescheduled } });
  return { opportunityId: opp.id, note: created ? "New deal created at DEMO." : "Existing deal moved to DEMO." };
}
