import { loadIntel } from "@/components/analytics/load";
import { NoAccess, PageTitle, Section, Status } from "@/components/analytics/kit";
import { integrationStatuses, posthogProjectUrl } from "@/lib/analytics/integrations";

export default async function ReplayPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const ph = integrationStatuses().find((i) => i.id === "posthog")!;
  const url = posthogProjectUrl();
  const on = ph.state === "connected";
  return (
    <div>
      <PageTitle title="Heatmaps & Session Replay" subtitle="Real recordings only. RaveSoft does not fake replays from click logs — replay and heatmap data comes from PostHog and is viewed there, behind PostHog’s own login." />
      <Section title="PostHog status" actions={<Status tone={on ? "ok" : "off"}>{on ? "Configured" : "Not configured"}</Status>}>
        <p className="text-sm text-gray-700">{ph.detail}</p>
        {on && url ? (
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            {[["Session replays", "/replay/recent"], ["Heatmaps", "/heatmaps"], ["Events", "/events"]].map(([l, p]) => <li key={l}><a className="block rounded-xl border border-gray-200 p-3 font-medium text-[#060297] hover:bg-gray-50" href={`${url}${p}`} target="_blank" rel="noopener noreferrer">{l} ↗</a></li>)}
          </ul>
        ) : on ? <p className="mt-3 text-sm text-amber-800">Recording is on, but POSTHOG_PROJECT_URL is not set, so no deep links can be shown.</p> : (
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-gray-700">
            <li>Create a PostHog project (US or EU cloud) and copy the <b>public</b> project key (starts with <code>phc_</code>).</li>
            <li>Set <code>NEXT_PUBLIC_POSTHOG_KEY</code> (and <code>NEXT_PUBLIC_POSTHOG_HOST</code> for EU: <code>https://eu.i.posthog.com</code>) in the hosting environment, then redeploy.</li>
            <li>Optionally set <code>POSTHOG_PROJECT_URL</code> (e.g. <code>https://us.posthog.com/project/12345</code>) to enable the links on this page.</li>
            <li>No private PostHog API key is needed or used by the browser; never put one in a <code>NEXT_PUBLIC_</code> variable.</li>
          </ol>
        )}
      </Section>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Privacy controls applied">
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            <li>Loads only on public marketing pages — never on <code>/admin</code> or <code>/pay</code>, so staff sessions and payment pages are not recorded.</li>
            <li>All form inputs are masked (<code>maskAllInputs</code>), including passwords. Add <code>data-rs-mask</code> to mask other text, <code>data-rs-block</code> to exclude an element.</li>
            <li>Honours consent (opt-in mode), Do Not Track and Global Privacy Control, and the same <code>?rs_ignore=1</code> opt-out as the RaveSoft tracker.</li>
            <li>Replay retention is set in your PostHog project settings (not in RaveSoft); set it to match Analytics Settings → retention.</li>
            <li>Access is limited to people you invite in PostHog; RaveSoft admins without PostHog accounts see only this status page.</li>
          </ul>
        </Section>
        <Section title="Fallback behaviour">
          <p className="text-sm text-gray-700">If PostHog is unreachable or unconfigured, nothing else changes: all RaveSoft Intelligence dashboards, lead attribution and exports run on first-party data stored in your own MySQL database. Scroll-depth analysis per page is available first-party on <b>Page Analytics</b>. Click and mobile/desktop heatmaps require PostHog.</p>
        </Section>
      </div>
    </div>
  );
}
