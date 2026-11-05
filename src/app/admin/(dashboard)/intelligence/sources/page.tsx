import { loadIntel } from "@/components/analytics/load";
import { BarList, ExportLink, FilterBar, NoAccess, PageTitle, Section, Table, chLabel, dur, fmt, pct } from "@/components/analytics/kit";
import { byChannel, bySource } from "@/lib/analytics/queries";

export default async function SourcesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await loadIntel(searchParams);
  if (!ctx) return <NoAccess />;
  const { f } = ctx;
  const [channels, sources] = await Promise.all([byChannel(f), bySource(f)]);
  return (
    <div>
      <PageTitle title="Traffic Sources" subtitle="How visitors arrived. Each session is classified once, from its click id, UTM tags or referrer, using the documented rules below."><ExportLink report="engagement" f={f} /></PageTitle>
      <FilterBar f={f} show={["country", "device", "campaign", "channel"]} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Channels" subtitle="Sessions"><BarList rows={channels.map((c) => ({ label: chLabel(c.key), value: c.sessions, sub: pct(c.conversionRate) + " conv." }))} /></Section>
        <Section title="Top sources" subtitle="utm_source, otherwise referring domain"><BarList rows={sources.map((c) => ({ label: c.key, value: c.sessions, sub: `${c.leads} leads` }))} /></Section>
      </div>
      <Section className="mt-6" title="Channel performance">
        <Table head={[{ label: "Channel" }, { label: "Sessions", right: true }, { label: "Visitors", right: true }, { label: "Leads", right: true }, { label: "Conv.", right: true }, { label: "Bounce", right: true }, { label: "Avg. engaged", right: true }]}
          rows={channels.map((c) => [chLabel(c.key), fmt(c.sessions), fmt(c.visitors), c.leads, pct(c.conversionRate), pct(c.bounceRate), dur(c.avgEngagement)])} />
        <p className="mt-3 text-xs text-gray-400">Leads are attributed to the <b>last-touch</b> channel. First-touch is on Lead Attribution.</p>
      </Section>
      <Section className="mt-6" title="Classification rules">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
          <li>Ad click id: <code>gclid</code> → Paid search; <code>fbclid</code>, <code>ttclid</code>, <code>li_fat_id</code> → Paid social.</li>
          <li><code>utm_medium</code>: cpc/ppc → Paid search · paid_social → Paid social · email → Email · whatsapp → WhatsApp · social → Social · organic → Organic search · referral → Referral.</li>
          <li>No UTMs: the referring domain decides (search engines → Organic search, social networks → Social, mail clients → Email, wa.me → WhatsApp, other sites → Referral, own site → ignored).</li>
          <li>Otherwise Direct. A new session starts when the campaign parameters change or after 30 minutes of inactivity.</li>
        </ol>
      </Section>
    </div>
  );
}
