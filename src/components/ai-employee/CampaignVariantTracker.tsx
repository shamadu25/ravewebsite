"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/utils";

export default function CampaignVariantTracker({ agent }: { agent: string | null }) {
  useEffect(() => {
    trackEvent("ai_employee_campaign_variant_viewed", { agent: agent ?? "default" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
