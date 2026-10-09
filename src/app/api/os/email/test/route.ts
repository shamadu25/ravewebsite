import { api } from "@/lib/os/http";
import { getChannelAdapter } from "@/lib/os/channels";
import { notificationRecipient } from "@/lib/mail/transporter";
import { audit } from "@/lib/os/audit";

/** Sends a real test email — only ever to the signed-in user's own address (or the configured owner mailbox), never to arbitrary recipients. */
export const POST = api("agent.configure", async ({ caller }) => {
  const to = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(caller.name) ? caller.name : notificationRecipient();
  if (!to) throw new Error("No recipient: sign in with an email address or set LEAD_NOTIFICATION_EMAIL / CONTACT_EMAIL.");
  const res = await getChannelAdapter("EMAIL").send({
    to, subject: "RaveSoft OS — email test",
    body: `This is a test from the RaveSoft AI Operating System, sent ${new Date().toISOString()}.\n\nIf you can read this in your inbox (not spam), outbound email is working. Reply to this message and then press "Check inbox now" in Integrations to test inbound.`,
  });
  await audit({ actor: caller.name, actorType: "HUMAN", action: "email.test", resource: "email", result: res.ok ? "SUCCESS" : "FAILURE", output: { to, ok: res.ok }, ip: caller.ip });
  if (!res.ok) throw new Error(`Email was NOT sent: ${res.error}`);
  return { to, messageId: res.providerRef };
});
