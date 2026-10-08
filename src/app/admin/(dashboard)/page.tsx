import { Suspense } from "react";
import AutoRefresh from "@/components/os/AutoRefresh";
import LiveRefresh from "@/components/os/LiveRefresh";
import SectionBoundary from "@/components/os/dashboard/SectionBoundary";
import { CardSkeleton, Skeleton } from "@/components/os/dashboard/Skeleton";
import CommandHero from "@/components/os/dashboard/CommandHero";
import AttentionStrip from "@/components/os/dashboard/AttentionStrip";
import KPIRow from "@/components/os/dashboard/KPIRow";
import RevenueProgress from "@/components/os/dashboard/RevenueProgress";
import AIWorkforce from "@/components/os/dashboard/AIWorkforce";
import PriorityList from "@/components/os/dashboard/PriorityList";
import BusinessUnitRevenue from "@/components/os/dashboard/BusinessUnitRevenue";
import ActivityTimeline from "@/components/os/dashboard/ActivityTimeline";
import AICommandInput from "@/components/os/dashboard/AICommandInput";

export const dynamic = "force-dynamic";

const Section = ({ label, fallback, children }: { label: string; fallback: React.ReactNode; children: React.ReactNode }) => (
  <SectionBoundary label={label}><Suspense fallback={fallback}>{children}</Suspense></SectionBoundary>
);

export default function CommandCentre() {
  return (
    <div className="min-w-0 space-y-8 lg:space-y-10">
      <AutoRefresh seconds={90} />
      <LiveRefresh />
      <Section label="the command centre header" fallback={<Skeleton className="h-40 w-full" />}><CommandHero /></Section>
      <Section label="alerts" fallback={null}><AttentionStrip /></Section>
      <Section label="key metrics" fallback={<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>}><KPIRow /></Section>
      <div className="grid gap-6 xl:grid-cols-5 [&>*]:min-w-0">
        <div className="min-w-0 xl:col-span-3"><Section label="revenue progress" fallback={<CardSkeleton rows={5} />}><RevenueProgress /></Section></div>
        <div className="min-w-0 xl:col-span-2"><Section label="AI Employees" fallback={<CardSkeleton rows={5} />}><AIWorkforce /></Section></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        <Section label="priorities" fallback={<CardSkeleton />}><PriorityList /></Section>
        <Section label="business unit revenue" fallback={<CardSkeleton />}><BusinessUnitRevenue /></Section>
        <div className="min-w-0 lg:col-span-2 xl:col-span-1"><Section label="recent activity" fallback={<CardSkeleton />}><ActivityTimeline /></Section></div>
      </div>
      <AICommandInput />
    </div>
  );
}
