import Script from "next/script";

/**
 * Loads the first-party RaveSoft Intelligence tracker AFTER the page is interactive and the browser is idle
 * (strategy="lazyOnload"), so it can never block rendering. Renders nothing visible. Set
 * NEXT_PUBLIC_ANALYTICS_CONSENT=opt_in to require an explicit "Accept" (also set Admin → Analytics Settings to opt-in).
 * Set NEXT_PUBLIC_INTEL_ENABLED=false to remove the script entirely.
 */
export default function IntelligenceTracker() {
  if (process.env.NEXT_PUBLIC_INTEL_ENABLED === "false") return null;
  const mode = process.env.NEXT_PUBLIC_ANALYTICS_CONSENT === "opt_in" ? "opt_in" : "opt_out";
  const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  return (
    <>
      <Script id="rs-intel" src="/rs-intel.js" strategy="lazyOnload" data-consent-mode={mode} />
      {phKey && <Script id="rs-posthog" src="/rs-posthog.js" strategy="lazyOnload" data-key={phKey} data-host={process.env.NEXT_PUBLIC_POSTHOG_HOST} data-consent-mode={mode} />}
    </>
  );
}
