import { loadIntel } from "@/components/analytics/load";
import { NoAccess, PageTitle, Section, Status, Table, fmt } from "@/components/analytics/kit";
import ApiForm from "@/components/os/ApiForm";
import { getSettings } from "@/lib/analytics/settings";
import { health } from "@/lib/analytics/queries";
import { integrationStatuses } from "@/lib/analytics/integrations";
import { can } from "@/lib/os/rbac";
import { prisma } from "@/lib/prisma";
import { CHANNELS } from "@/lib/analytics/classify";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const manage = can(ctx.caller.role, "analytics.manage");
  const [s, h, spend] = await Promise.all([getSettings(true), health(), prisma.analyticsAdSpend.findMany({ orderBy: { day: "desc" }, take: 15 })]);
  return (
    <div className="space-y-6">
      <PageTitle title="Analytics Settings" subtitle="Collection, privacy, retention, attribution and spend. Changes are written to the audit log." />
      <Section title="Collection health" subtitle="Proof of what is actually stored">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm"><span>Visitors <b>{fmt(h.visitors)}</b></span><span>Sessions <b>{fmt(h.sessions)}</b></span><span>Events <b>{fmt(h.events)}</b></span><span>Lead conversions <b>{fmt(h.conversions)}</b></span>
          <span>Last event <b>{h.lastEventAt ? h.lastEventAt.toISOString().replace("T", " ").slice(0, 19) + " UTC" : "none yet"}</b></span>
          <Status tone={s.enabled ? "ok" : "bad"}>{s.enabled ? "Collecting" : "Collection paused"}</Status></div>
        <p className="mt-3 text-xs text-gray-500">Environment: tracker consent mode in the page is <code>NEXT_PUBLIC_ANALYTICS_CONSENT</code> ({process.env.NEXT_PUBLIC_ANALYTICS_CONSENT === "opt_in" ? "opt_in" : "opt_out"}); the server enforces the setting below. Keep both identical.</p>
      </Section>
      {manage ? (
        <Section title="Collection, privacy & retention">
          <ApiForm url="/api/intel/admin" submitLabel="Save settings" extra={{ action: "settings" }} fields={[
            { name: "enabled", label: "Collect analytics", type: "checkbox", defaultValue: s.enabled },
            { name: "consentMode", label: "Consent mode (opt_out = track unless declined/DNT/GPC · opt_in = only after Accept)", type: "select", options: ["opt_out", "opt_in"], defaultValue: s.consentMode },
            { name: "rawRetentionDays", label: "Raw data retention (days)", type: "number", defaultValue: s.rawRetentionDays },
            { name: "attributionWindowDays", label: "Last-touch attribution window (days)", type: "number", defaultValue: s.attributionWindowDays },
            { name: "excludedPaths", label: "Paths never tracked (space/comma separated)", defaultValue: s.excludedPaths.join(" ") },
            { name: "alertTrafficDropPct", label: "Alert: traffic drop ≥ %", type: "number", defaultValue: s.alertTrafficDropPct },
            { name: "alertTrafficSpikePct", label: "Alert: traffic spike ≥ %", type: "number", defaultValue: s.alertTrafficSpikePct },
            { name: "alertFormFailurePct", label: "Alert: form failure rate ≥ %", type: "number", defaultValue: s.alertFormFailurePct },
            { name: "alertConversionDropPct", label: "Alert: conversion drop ≥ %", type: "number", defaultValue: s.alertConversionDropPct },
          ]} />
          <p className="mt-3 text-xs text-gray-500">Retention runs daily around 03:00 UTC through the existing scheduler. Raw events are rolled into daily summaries first. Lead conversion records are kept (they describe a lead you already store) and contain no IP address.</p>
        </Section>
      ) : <Section title="Collection, privacy & retention"><p className="text-sm text-gray-600">Retention {s.rawRetentionDays} days · attribution window {s.attributionWindowDays} days · consent mode {s.consentMode}. Changing settings requires the analytics.manage permission.</p></Section>}
      {manage && (
        <>
          <Section title="Advertising spend" subtitle="Typed in by you from the ad platform’s own reports. Used only to compute cost per lead.">
            <ApiForm url="/api/intel/admin" submitLabel="Save spend" extra={{ action: "spend" }} fields={[
              { name: "day", label: "Day (YYYY-MM-DD)", required: true, placeholder: new Date().toISOString().slice(0, 10) },
              { name: "channel", label: "Channel", type: "select", options: CHANNELS.filter((c) => ["paid_search", "paid_social", "email", "whatsapp", "social", "other"].includes(c)) as unknown as string[] },
              { name: "campaign", label: "Campaign (utm_campaign, optional)" },
              { name: "amountUsd", label: "Spend (USD)", type: "number", required: true },
            ]} />
            <div className="mt-4"><Table head={[{ label: "Day" }, { label: "Channel" }, { label: "Campaign" }, { label: "USD", right: true }, { label: "By" }]} empty="No spend entered."
              rows={spend.map((x) => [x.day.toISOString().slice(0, 10), x.channel, x.campaign || "—", (x.amountCents / 100).toFixed(2), x.createdBy ?? x.source])} /></div>
          </Section>
          <Section title="Data deletion" subtitle="Removes one anonymous visitor’s sessions, page views and events (e.g. after a data-subject request). The visitor id is the full id on the session record; lead records are not touched.">
            <ApiForm url="/api/intel/admin" submitLabel="Delete visitor data" extra={{ action: "delete_visitor" }} fields={[{ name: "visitorId", label: "Visitor id", required: true }]} />
          </Section>
          <Section title="Maintenance">
            <div className="flex flex-wrap gap-3"><ApiForm url="/api/intel/admin" submitLabel="Run retention now" extra={{ action: "run_retention" }} fields={[]} /><ApiForm url="/api/intel/admin" submitLabel="Check alerts now" extra={{ action: "check_alerts" }} fields={[]} /></div>
          </Section>
        </>
      )}
      <Section title="Integrations" subtitle="Optional. Each shows exactly what works today.">
        <ul className="space-y-3 text-sm">{integrationStatuses().map((i) => (
          <li key={i.id}><div className="flex flex-wrap items-center gap-2"><b>{i.name}</b><Status tone={i.state === "connected" ? "ok" : i.state === "partial" ? "warn" : "off"}>{i.state === "connected" ? "Configured" : i.state === "partial" ? "Tag only" : "Not configured"}</Status></div>
            <p className="mt-1 text-gray-600">{i.detail}</p>{i.env.length > 0 && <p className="mt-1 text-xs text-gray-400">Env: {i.env.join(", ")}</p>}</li>))}</ul>
      </Section>
      <Section title="Methodology (how numbers are defined)">
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {[
            ["Visitor", "A random id stored in this browser (first-party cookie + local storage, 2 years). Not a person; clearing storage creates a new visitor."],
            ["Session", "Starts on first page view; ends after 30 minutes without activity, or when the campaign parameters change. Elapsed = last activity − start."],
            ["Active engagement", "Time the page is visible AND the visitor interacted (mouse, key, scroll, touch, click) within the last 15 s. Hidden tabs add nothing."],
            ["Elapsed page time", "Visible time on a page. Reported by cumulative heartbeats every 15 s and on exit, so retried or duplicated beacons cannot inflate it; the server also caps it by real elapsed time."],
            ["Bounce", "A session with under 10 s of active time, only one page view and no conversion (engaged-session definition, as GA4)."],
            ["Total vs unique visitors", "Unique = distinct visitor ids in the period. Total = distinct visitors per day, summed (a returning visitor counts each day)."],
            ["Conversion", "Written only after the lead is saved by the existing backend; one per lead; the browser can never declare success."],
            ["First / last touch", "First touch is stored on the visitor once and never overwritten. Last touch is the converting session’s channel, or the latest non-direct session inside the attribution window."],
            ["Location", "Country/region/city from the hosting edge’s IP lookup; approximate, never GPS. If unavailable, country may be estimated from the browser time zone and is flagged as an estimate. IPs are not stored."],
            ["Bots & staff", "Known bot user-agents are dropped at ingest. Signed-in administrators’ own visits are never recorded."],
          ].map(([t, d]) => <div key={t}><dt className="font-semibold text-gray-900">{t}</dt><dd className="text-gray-600">{d}</dd></div>)}
        </dl>
      </Section>
    </div>
  );
}
