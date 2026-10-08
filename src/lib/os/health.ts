export type Health = "GREEN" | "YELLOW" | "RED";

export interface HealthInput {
  status: string;
  lastActiveAt: Date | null;
  usage30d: number | null;
  usagePrev30d: number | null;
  paymentFailed?: boolean;
  openSupportTickets?: number | null;
  now?: Date;
}

/** Health from the signals we actually have. Missing signals are reported, never assumed healthy. */
export function computeHealth(i: HealthInput): { health: Health; reasons: string[]; missingSignals: string[] } {
  const now = i.now ?? new Date();
  const reasons: string[] = [];
  const missing: string[] = [];
  let red = 0, yellow = 0;

  if (i.paymentFailed) { red++; reasons.push("Payment failed"); }
  if (i.status === "CHURNED") { red += 2; reasons.push("Customer churned"); }

  if (i.usage30d != null && i.usagePrev30d != null && i.usagePrev30d > 0) {
    const change = i.usage30d / i.usagePrev30d - 1;
    if (change <= -0.5) { red++; reasons.push(`Usage down ${Math.round(-change * 100)}% vs prior 30 days`); }
    else if (change <= -0.2) { yellow++; reasons.push(`Usage down ${Math.round(-change * 100)}%`); }
  } else missing.push("usage trend (no product usage feed connected)");

  if (i.lastActiveAt) {
    const days = (now.getTime() - i.lastActiveAt.getTime()) / 86400_000;
    if (days > 30) { red++; reasons.push(`No activity for ${Math.floor(days)} days`); }
    else if (days > 14) { yellow++; reasons.push(`No activity for ${Math.floor(days)} days`); }
  } else missing.push("last activity");

  if (i.openSupportTickets != null && i.openSupportTickets >= 3) { yellow++; reasons.push(`${i.openSupportTickets} open support tickets`); }
  else if (i.openSupportTickets == null) missing.push("support tickets");

  const health: Health = red > 0 ? "RED" : yellow > 0 ? "YELLOW" : missing.length >= 2 ? "YELLOW" : "GREEN";
  if (health === "YELLOW" && !yellow && !red) reasons.push("INSUFFICIENT DATA: too few signals to confirm health");
  return { health, reasons, missingSignals: missing };
}
