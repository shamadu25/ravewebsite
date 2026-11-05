import Link from "next/link";
import { notFound } from "next/navigation";
import { loadIntel } from "@/components/analytics/load";
import { Kpi, KpiGrid, NoAccess, PageTitle, Section, Status, chLabel, dur } from "@/components/analytics/kit";
import { sessionTimeline } from "@/lib/analytics/queries";

const LABEL: Record<string, string> = {
  page_view: "Viewed", cta_click: "Clicked call-to-action", form_start: "Started the enquiry form", form_view: "Saw a form", form_field_interaction: "Interacted with a form field", form_submit_attempt: "Pressed submit",
  form_submit_failure: "Submission failed", lead_created: "Enquiry successfully submitted (confirmed by backend)", whatsapp_click: "Clicked WhatsApp", phone_click: "Clicked phone number", email_click: "Clicked email",
  outbound_click: "Left the site via", file_download: "Downloaded", pricing_view: "Viewed pricing", product_view: "Viewed a product/service page", contact_page_view: "Opened a contact page", demo_request: "Requested a demo",
  scroll: "Scrolled to", js_error: "Browser error", request_failed: "A request failed", internal_navigation: "Navigated within the site", video_play: "Played a video", video_complete: "Finished a video", click: "Clicked",
};

export default async function SessionPage({ params, searchParams }: { params: Promise<{ sessionId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const { sessionId } = await params;
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(sessionId)) notFound();
  const data = await sessionTimeline(sessionId);
  if (!data) notFound();
  const { session: s, events, conversion } = data;
  const items = events.map((e) => {
    const p = (e.props ?? {}) as Record<string, unknown>;
    const extra = e.type === "scroll" ? ` ${p.depth}%` : e.type === "page_view" ? "" : p.label ? ` “${p.label}”` : p.host ? ` ${p.host}` : p.file ? ` ${p.file}` : p.reason ? ` (${p.reason})` : "";
    return { at: e.occurredAt, text: `${LABEL[e.type] ?? e.type.replace(/_/g, " ")}${e.type === "page_view" || e.type.endsWith("_view") ? ` ${e.path ?? ""}` : extra}`, type: e.type };
  });
  return (
    <div>
      <PageTitle title="Session timeline" subtitle={`Anonymous visitor ${s.visitor.visitorId.slice(0, 8)} · visit #${s.visitNumber}`}><Link href="/admin/intelligence/visitors" className="text-sm text-[#060297] underline">← All sessions</Link></PageTitle>
      <KpiGrid>
        <Kpi label="Source" value={chLabel(s.channel)} hint={[s.utmSource ?? s.referrerDomain, s.utmCampaign].filter(Boolean).join(" · ") || "Direct"} />
        <Kpi label="Location (approx.)" value={s.country ?? "Unknown"} hint={`${[s.city, s.region].filter(Boolean).join(", ") || "no city"} · ${s.geoSource === "timezone_estimate" ? "estimated from time zone" : s.geoSource ? "IP-based" : "unavailable"}`} />
        <Kpi label="Device" value={s.device} hint={`${s.browser ?? "?"} ${s.browserVersion ?? ""} · ${s.os ?? "?"} · ${s.screen ?? ""}`} />
        <Kpi label="Engaged / elapsed" value={`${dur(s.engagedSeconds)} / ${dur(s.elapsedSeconds)}`} hint={`${s.pageViews} page views · scroll ${s.maxScroll}%`} accent={s.converted} />
      </KpiGrid>
      {conversion && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This session produced lead #{conversion.leadId}. <Link className="underline" href={`/admin/leads/${conversion.leadId}`}>Open the lead</Link>.</p>}
      <Section className="mt-6" title="Activity" subtitle="Events recorded in order. Form field values are never recorded.">
        <ol className="space-y-2.5 border-l-2 border-gray-200 pl-5">
          {items.map((i, n) => (
            <li key={n} className="relative text-sm">
              <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white" style={{ background: i.type === "lead_created" ? "#FFB200" : "#060297" }} />
              <span className="mr-2 tabular-nums text-xs text-gray-400">{i.at.toISOString().slice(11, 19)} UTC</span>{i.text}{i.type === "lead_created" && <> <Status tone="warn">conversion</Status></>}
            </li>))}
        </ol>
        {!items.length && <p className="text-sm text-gray-500">No events.</p>}
      </Section>
    </div>
  );
}
