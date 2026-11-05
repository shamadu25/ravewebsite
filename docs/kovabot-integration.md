# Kovabot integration contract (not yet implemented — by design)

RaveSoft intends to use Kovabot as its AI-workforce execution layer. Its deployment API has **not been verified**, so no Kovabot call is made and no deployment is ever fabricated.

Today: `src/lib/ai-automation/integrations/provider.ts` defines `DeploymentProvider`. `kovabotProvider.isAvailable()` is always `false`; `manualProvider` records a manual hand-off (`ai_implementation_projects`, `ai_integration_logs`). The assessment/pricing/proposal system has no dependency on Kovabot.

## Contract needed from Kovabot before implementing `kovabotProvider.provision`
1. Auth scheme + credentials (env `KOVABOT_API_URL`, `KOVABOT_API_KEY`).
2. `POST` create-deployment: input = customer/business id, agent list (solution key, name, complexity), integrations; output = external deployment id + status.
3. Status/poll or webhook for PROVISIONING → TESTING → LIVE / FAILED.
4. Idempotency key support (we send `provision:<projectId>`).
5. Usage + subscription status endpoint.
6. Sandbox for testing.

Flow once verified: proposal ACCEPTED → implementation project (already created) → payment/scope confirmed by a human → `PROVISION` job → provider call → status logged. Flip `isAvailable()` only after contract tests pass.
