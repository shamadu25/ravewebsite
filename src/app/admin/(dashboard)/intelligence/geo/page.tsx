import Link from "next/link";
import { loadIntel } from "@/components/analytics/load";
import { BLUE, AMBER, BarList, Empty, ExportLink, FilterBar, Kpi, KpiGrid, NoAccess, PageTitle, Section, Table, dur, fmt, pct } from "@/components/analytics/kit";
import { byCountry, regionsAndCities, overview } from "@/lib/analytics/queries";
import { filterQuery } from "@/lib/analytics/filters";
import { countryName } from "@/lib/analytics/classify";
import { CENTROID } from "@/components/analytics/countries";

export default async function GeoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const { f } = ctx;
  // Rankings always show every country so the map can be clicked; the selected country filters the detail panel.
  const all = { ...f, country: undefined };
  const [countries, places, sel] = await Promise.all([byCountry(all), regionsAndCities(f), f.country ? overview(f) : Promise.resolve(null)]);
  const max = Math.max(1, ...countries.map((c) => c.sessions));
  const W = 720, H = 360;
  const X = (lng: number) => ((lng + 180) / 360) * W, Y = (lat: number) => ((90 - lat) / 180) * H;
  const base = filterQuery(all);
  const unknown = countries.find((c) => !c.key);

  return (
    <div>
      <PageTitle title="Geographic Analytics" subtitle="Location comes from the hosting network’s IP lookup (country-level reliable; region and city are approximate and often reflect the internet provider, not the visitor). It is never GPS or a precise location, and IP addresses are not stored.">
        <ExportLink report="geographic" f={f} />
      </PageTitle>
      <FilterBar f={f} show={["channel", "device", "campaign"]} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Section className="xl:col-span-2" title="Visitor map" subtitle="Bubble size = sessions. Click a country to inspect it.">
          {countries.filter((c) => c.key).length === 0 ? <Empty hint="No location data yet. Country is read from edge headers (Vercel / Cloudflare); behind plain Apache it falls back to a time-zone estimate, clearly labelled on each session." /> : (
            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-xl bg-slate-50" role="img" aria-label="World map of sessions by country">
              {[-60, -30, 0, 30, 60].map((lat) => <line key={lat} x1="0" x2={W} y1={Y(lat)} y2={Y(lat)} stroke="#e2e8f0" strokeDasharray={lat === 0 ? "0" : "3 4"} />)}
              {[-120, -60, 0, 60, 120].map((lng) => <line key={lng} y1="0" y2={H} x1={X(lng)} x2={X(lng)} stroke="#e2e8f0" strokeDasharray={lng === 0 ? "0" : "3 4"} />)}
              {countries.filter((c) => c.key && CENTROID[c.key]).map((c) => {
                const [lat, lng] = CENTROID[c.key], r = 5 + Math.sqrt(c.sessions / max) * 22, on = f.country === c.key;
                return (
                  <a key={c.key} href={`?${filterQuery({ ...all, country: c.key })}`}>
                    <circle cx={X(lng)} cy={Y(lat)} r={r} fill={on ? AMBER : BLUE} fillOpacity={on ? 0.85 : 0.45} stroke={on ? BLUE : "#fff"} strokeWidth="1.5"><title>{`${c.label ?? countryName(c.key)}: ${fmt(c.sessions)} sessions, ${c.leads} leads`}</title></circle>
                  </a>
                );
              })}
            </svg>
          )}
          <p className="mt-2 text-xs text-gray-400">Bubbles sit at an approximate centre of each country. {countries.filter((c) => c.key && !CENTROID[c.key]).length > 0 && `${countries.filter((c) => c.key && !CENTROID[c.key]).length} country(ies) are in the table but not drawn on the map.`}{unknown ? ` ${fmt(unknown.sessions)} sessions have no location.` : ""}</p>
        </Section>
        <Section title={f.country ? `${countryName(f.country) ?? f.country} — inspection` : "Select a country"} actions={f.country ? <Link className="text-xs text-[#060297] underline" href={`?${base}`}>Clear</Link> : undefined}>
          {sel ? (
            <KpiGrid>
              <Kpi label="Sessions" value={fmt(sel.cur.sessions)} cur={sel.cur.sessions} prev={sel.prev.sessions} />
              <Kpi label="Visitors" value={fmt(sel.cur.uniqueVisitors)} cur={sel.cur.uniqueVisitors} prev={sel.prev.uniqueVisitors} />
              <Kpi label="Leads" value={fmt(sel.cur.leadsAttributed)} cur={sel.cur.leadsAttributed} prev={sel.prev.leadsAttributed} />
              <Kpi label="Conversion" value={pct(sel.cur.conversionRate)} cur={sel.cur.conversionRate} prev={sel.prev.conversionRate} />
              <Kpi label="Avg. engagement" value={dur(sel.cur.avgEngagement)} cur={sel.cur.avgEngagement} prev={sel.prev.avgEngagement} />
              <Kpi label="Bounce rate" value={pct(sel.cur.bounceRate)} cur={sel.cur.bounceRate} prev={sel.prev.bounceRate} inverse />
            </KpiGrid>
          ) : <p className="text-sm text-gray-500">Click a bubble or a row below to see that country’s traffic and conversion performance. All other filters still apply.</p>}
        </Section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Countries"><Table head={[{ label: "Country" }, { label: "Visitors", right: true }, { label: "Sessions", right: true }, { label: "Leads", right: true }, { label: "Conv.", right: true }, { label: "Avg. engaged", right: true }]}
          rows={countries.filter((c) => c.key).slice(0, 40).map((c) => [<Link key="c" className="text-[#060297] underline" href={`?${filterQuery({ ...all, country: c.key })}`}>{c.label ?? countryName(c.key)}</Link>, fmt(c.visitors), fmt(c.sessions), c.leads, pct(c.conversionRate), dur(c.avgEngagement)])} /></Section>
        <div className="space-y-6">
          <Section title="Regions (approximate)"><BarList rows={places.regions.map((r) => ({ label: `${r.name}${r.cc ? `, ${r.cc}` : ""}`, value: r.sessions }))} emptyHint="Region data appears only when the hosting edge provides it." /></Section>
          <Section title="Cities (approximate)"><BarList rows={places.cities.map((r) => ({ label: `${r.name}${r.cc ? `, ${r.cc}` : ""}`, value: r.sessions }))} emptyHint="City data appears only when the hosting edge provides it." /></Section>
        </div>
      </div>
    </div>
  );
}
