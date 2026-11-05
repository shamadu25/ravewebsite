import { api } from "@/lib/os/http";
import { getChannelAdapter } from "@/lib/os/channels";
import { alertNumbers, maskNumber } from "@/lib/sms/alerts";
import { audit } from "@/lib/os/audit";

/** Sends a real test SMS — only ever to the numbers configured in SMS_ALERT_NUMBERS, never to arbitrary recipients. */
export const POST = api("agent.configure", async ({ caller }) => {
  const numbers = alertNumbers();
  if (!numbers.length) throw new Error("No alert numbers: set SMS_ALERT_NUMBERS (e.g. +233531561484,+233201234567).");
  const sms = getChannelAdapter("SMS");
  const status = sms.status();
  if (!status.connected) throw new Error(status.reason ?? "SMS is not connected.");
  const body = `RaveSoft: test alert sent ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC. If you can read this, instant SMS alerts are working.`;
  const results = await Promise.all(numbers.map((to) => sms.send({ to, body })));
  const sent = results.filter((r) => r.ok).length;
  await audit({ actor: caller.name, actorType: "HUMAN", action: "sms.test", resource: "sms", result: sent > 0 ? "SUCCESS" : "FAILURE", output: { recipients: numbers.length, sent }, ip: caller.ip });
  if (sent === 0) {
    const err = results.find((r) => !r.ok) as { error: string } | undefined;
    throw new Error(`SMS was NOT sent: ${err?.error ?? "unknown error"}`);
  }
  return { sent, total: numbers.length, to: numbers.map(maskNumber).join(", ") };
});
