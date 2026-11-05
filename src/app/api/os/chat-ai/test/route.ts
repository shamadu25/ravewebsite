import { api } from "@/lib/os/http";
import { testChatAi } from "@/lib/ai/health";
import { audit } from "@/lib/os/audit";

/** Live check of the AI behind the website chat: one tiny real request, with the exact cause when it fails. */
export const POST = api("agent.configure", async ({ caller }) => {
  const result = await testChatAi();
  await audit({ actor: caller.name, actorType: "HUMAN", action: "chat_ai.test", resource: "chat_ai", result: result.ok ? "SUCCESS" : "FAILURE", output: result.ok ? { model: result.model } : { cause: result.cause }, ip: caller.ip });
  if (!result.ok) throw new Error(`${result.summary} Fix: ${result.fix}`);
  return { model: result.model, provider: result.provider, latencyMs: result.latencyMs };
});
