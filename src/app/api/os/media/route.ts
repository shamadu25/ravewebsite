import { api } from "@/lib/os/http";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/os/constants";
import { logActivity } from "@/lib/os/crm";
import { audit } from "@/lib/os/audit";
import { mediaToMessage, understandMedia, validateMedia } from "@/lib/os/media";

export const maxDuration = 60;

/** Admin: read a voice note or photo (e.g. one a customer sent you on WhatsApp that you saved), optionally saving the result on a deal. */
export const POST = api("opportunity.write", async ({ request, caller }) => {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Choose a file first.");
  const v = validateMedia(file.type, file.size);
  if ("error" in v) throw new Error(v.error);
  const r = await understandMedia(v.kind, file.type, Buffer.from(await file.arrayBuffer()));
  const text = mediaToMessage(v.kind, r);
  const oppId = Number(form.get("opportunityId") ?? 0);
  let saved = false;
  if (oppId && form.get("save") === "true") {
    if (!(await prisma.osOpportunity.findFirst({ where: { id: oppId, orgId: ORG_ID } }))) throw new Error("Opportunity not found.");
    await logActivity(oppId, { actor: caller.name, actorType: "HUMAN" }, "NOTE", `${text}`.slice(0, 2000));
    saved = true;
  }
  await audit({ actor: caller.name, actorType: "HUMAN", action: "media.understood", resource: "media", output: { kind: v.kind, provider: r.provider, costUsd: r.costUsd, saved }, ip: caller.ip });
  return { kind: v.kind, text, language: r.language, provider: r.provider, saved };
});
