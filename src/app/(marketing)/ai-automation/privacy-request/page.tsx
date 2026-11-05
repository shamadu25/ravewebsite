import type { Metadata } from "next";
import { Container } from "@/components/ai-automation/ui";
import PrivacyRequestForm from "./PrivacyRequestForm";
import { buildMetadata } from "@/lib/ai-automation/seo";

export const metadata: Metadata = buildMetadata({ title: "Privacy request | RaveSoft", description: "Ask RaveSoft to correct or delete your information, or stop emails.", path: "/ai-automation/privacy-request", keywords: [], noindex: true });

export default function PrivacyRequestPage() {
  return (
    <main className="bg-[#F7F9FC] pb-20 pt-32 text-[#172033]"><Container className="max-w-xl"><h1 className="text-2xl font-bold text-[#071536]">Privacy request</h1><p className="mt-3 text-[15px] text-[#64748B]">Use this form to ask us to correct or delete the information you gave in the AI business assessment, or to stop emails. We respond to requests by email.</p><PrivacyRequestForm /></Container></main>
  );
}
