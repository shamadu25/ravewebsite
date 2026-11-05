import { z } from "zod";
import { api, jsonBody } from "@/lib/os/http";
import { setSetting } from "@/lib/ai-automation/settings";
import { logActivity } from "@/lib/ai-automation/crm";

const Rate = z.object({ rate: z.number().positive().max(1_000_000), source: z.string().min(2).max(160), asOf: z.string().datetime() });
const Body = z.object({ rates: z.object({ GHS: Rate.optional(), NGN: Rate.optional(), GBP: Rate.optional() }) });

/** Manually configured exchange rates (units of currency per 1 USD) with their source and timestamp. Never fetched live. */
export const PUT = api("ai.pricing", async ({ request, caller }) => {
  const b = await jsonBody(request, Body);
  await setSetting("pricing.fx", { base: "USD", rates: b.rates }, caller.name);
  await logActivity({ actor: caller.name, action: "pricing.fx_saved", detail: { currencies: Object.keys(b.rates) } });
  return { saved: true };
});
