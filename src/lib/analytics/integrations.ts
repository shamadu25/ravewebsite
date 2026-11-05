export interface IntegrationStatus {
  id: "posthog" | "ga4" | "google_ads" | "meta_ads";
  name: string;
  state: "connected" | "partial" | "not_configured";
  /** What is actually working today — never overstated. */
  detail: string;
  env: string[];
}

const has = (k: string) => Boolean(process.env[k]);

/** Status derived only from which server env vars exist. Secrets are never read into the UI, only their presence. */
export function integrationStatuses(): IntegrationStatus[] {
  const ph = has("NEXT_PUBLIC_POSTHOG_KEY");
  return [
    {
      id: "posthog", name: "PostHog (session replay & heatmaps)",
      state: ph ? "connected" : "not_configured",
      detail: ph
        ? `Browser SDK loads after consent with all inputs masked${has("POSTHOG_PROJECT_URL") ? "; deep links to your PostHog project are enabled" : ""}. Replays and heatmaps are viewed in PostHog; RaveSoft’s own dashboards do not depend on it.`
        : "Not configured. Set NEXT_PUBLIC_POSTHOG_KEY (public project key) to start recording. No replay or heatmap data exists until then.",
      env: ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST", "POSTHOG_PROJECT_URL"],
    },
    {
      id: "ga4", name: "Google Analytics 4",
      state: has("NEXT_PUBLIC_GA_ID") ? "partial" : "not_configured",
      detail: has("NEXT_PUBLIC_GA_ID") ? "The existing GA4 tag is installed on the site. Importing GA4 reports into this dashboard is not implemented; GA4 numbers are never mixed with first-party data here." : "Not configured (NEXT_PUBLIC_GA_ID empty).",
      env: ["NEXT_PUBLIC_GA_ID"],
    },
    {
      id: "google_ads", name: "Google Ads (spend import)",
      state: "not_configured",
      detail: "Automatic spend import is not implemented. Enter daily spend manually in Analytics Settings → Ad spend; cost-per-lead is computed only from spend you enter.",
      env: [],
    },
    {
      id: "meta_ads", name: "Meta Ads (spend import)",
      state: has("NEXT_PUBLIC_META_PIXEL_ID") ? "partial" : "not_configured",
      detail: has("NEXT_PUBLIC_META_PIXEL_ID") ? "The existing Meta Pixel is installed. Automatic spend import is not implemented; enter spend manually in Analytics Settings." : "Not configured. Spend can be entered manually in Analytics Settings.",
      env: ["NEXT_PUBLIC_META_PIXEL_ID"],
    },
  ];
}

export function posthogProjectUrl(): string | null {
  const u = process.env.POSTHOG_PROJECT_URL;
  return u && /^https:\/\/[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(u) ? u.replace(/\/$/, "") : null;
}
