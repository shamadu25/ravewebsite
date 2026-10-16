import { growthApi } from "@/lib/growth/api";
import { enrichPerson } from "@/lib/growth/enrich";

export const maxDuration = 60;
export const POST = growthApi<{ id: string }>("opportunity.write", async ({ caller, params }) => enrichPerson(Number(params.id), caller.name));
