import { PageHeader, Card } from "@/components/os/ui";

export const dynamic = "force-dynamic";
const URL_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://ravesoftsolutions.com";

const vars: Array<[string, string, string]> = [
  ["WHATSAPP_ACCESS_TOKEN", "Permanent access token (System User token) from Meta", "Needed to send replies and download customers' voice notes and photos"],
  ["WHATSAPP_PHONE_NUMBER_ID", "Phone number ID of your WhatsApp Business number", "Which number messages are sent from"],
  ["WHATSAPP_VERIFY_TOKEN", "Any secret string you choose", "Used once when you register the webhook"],
  ["WHATSAPP_APP_SECRET", "App Secret from your Meta app", "Proves incoming webhooks really came from Meta"],
];

export default function WhatsAppSetupPage() {
  const ok = vars.map(([k]) => Boolean(process.env[k]));
  return (
    <div className="space-y-8">
      <PageHeader title="WhatsApp setup" subtitle="The official, ban-safe way to connect WhatsApp. Until it is connected, RaveSoft never sends or reads WhatsApp automatically." />
      <Card>
        <h2 className="mb-3 text-[15px] font-semibold">Status</h2>
        <ul className="space-y-2 text-[14px]">
          {vars.map(([k, what, why], i) => (
            <li key={k} className="flex flex-wrap items-start justify-between gap-2"><span><span className="font-mono text-[12px]">{k}</span><span className="block text-[12px] text-[var(--muted)]">{what} — {why}</span></span><span className={ok[i] ? "text-emerald-700" : "text-[var(--muted)]"}>{ok[i] ? "✓ set" : "NOT SET"}</span></li>
          ))}
        </ul>
        <p className="mt-3 text-[13px]">Webhook URL for Meta: <span className="break-all font-mono text-[12px]">{URL_BASE}/api/os/webhooks/whatsapp</span></p>
      </Card>
      <Card>
        <h2 className="mb-3 text-[15px] font-semibold">Setup checklist</h2>
        <ol className="list-decimal space-y-2 pl-5 text-[14px]">
          <li><b>Meta Business account:</b> create one at business.facebook.com and complete <b>Business Verification</b> (company documents). Without it, sending is heavily limited.</li>
          <li><b>A number for the API.</b> Use a number that is <u>not</u> currently registered in the WhatsApp or WhatsApp Business app. A registered number must be deleted from the app first (you lose that app&apos;s chat history), or use a new SIM / virtual number. Do not move your current main number unless you accept that.</li>
          <li><b>Create a Meta app</b> (type Business) and add the <b>WhatsApp</b> product. Add your number and set a display name (Meta reviews it).</li>
          <li><b>Create a System User</b> in Business Settings, give it WhatsApp permissions, and generate a <b>permanent token</b>. Copy the token, the Phone Number ID and the App Secret.</li>
          <li><b>Add the four variables above in Vercel</b> (production) and redeploy.</li>
          <li><b>Register the webhook</b> in the Meta app: callback URL above, your verify token, and subscribe to <b>messages</b>.</li>
          <li><b>Create message templates</b> (Meta approves them, usually within a day). Templates are required to start a conversation outside the 24-hour reply window.</li>
          <li><b>Test with your own number</b>: message the business number, confirm the reply appears on the deal, then send a voice note and a photo and confirm they are read.</li>
        </ol>
        <p className="mt-3 text-[12px] text-[var(--muted)]">Faster alternative: a Business Solution Provider (e.g. Twilio, 360dialog, Termii) handles steps 1–4 for you for a fee. Tell me which one you choose and I will adapt the connection.</p>
      </Card>
      <Card>
        <h2 className="mb-3 text-[15px] font-semibold">What keeps your number safe</h2>
        <div className="grid gap-4 text-[14px] sm:grid-cols-2">
          <div><p className="mb-1 font-semibold text-emerald-700">Do</p><ul className="list-disc space-y-1 pl-5 text-[13px]"><li>Reply to people who messaged you, within 24 hours.</li><li>Get opt-in before sending first (a form tick, a chat where they asked to be contacted).</li><li>Use approved templates to start conversations.</li><li>Honour &quot;stop&quot; immediately (RaveSoft does this automatically).</li><li>Keep it to your own business&apos;s customers and enquiries — Meta restricts general-purpose AI bots.</li></ul></div>
          <div><p className="mb-1 font-semibold text-red-700">Never</p><ul className="list-disc space-y-1 pl-5 text-[13px]"><li>Use QR-code &quot;WhatsApp automation&quot; tools, WhatsApp Web scrapers, or libraries like Baileys / whatsapp-web.js. This is the main cause of banned numbers.</li><li>Send cold messages to bought or scraped lists.</li><li>Blast the same text to many people.</li><li>Keep messaging people who ignore you or report you.</li></ul></div>
        </div>
        <p className="mt-3 text-[12px] text-[var(--muted)]">RaveSoft only talks to WhatsApp through Meta&apos;s official Cloud API, and its WhatsApp sender refuses contacts who haven&apos;t messaged you or opted in. Meta&apos;s terms and pricing change — re-check the current WhatsApp Business Terms and pricing before launch.</p>
      </Card>
    </div>
  );
}
