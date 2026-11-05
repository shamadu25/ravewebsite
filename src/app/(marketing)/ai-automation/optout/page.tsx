import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ai-automation/ui";
import OptOutForm from "./OptOutForm";
import { buildMetadata } from "@/lib/ai-automation/seo";

export const metadata: Metadata = buildMetadata({ title: "Stop emails | RaveSoft", description: "Stop follow-up emails about your RaveSoft proposal.", path: "/ai-automation/optout", keywords: [], noindex: true });

export default async function OptOutPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <main className="bg-[#F7F9FC] pb-20 pt-32 text-[#172033]"><Container className="max-w-xl"><h1 className="text-2xl font-bold text-[#071536]">Stop emails about your proposal</h1><p className="mt-3 text-[15px] text-[#64748B]">Confirm below and we will stop sending follow-up emails about your proposal. You can also ask us to correct or delete your information from the <Link className="underline" href="/ai-automation/privacy-request">privacy request page</Link>.</p><OptOutForm token={t ?? ""} /></Container></main>
  );
}
