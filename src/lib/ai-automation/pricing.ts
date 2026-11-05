/**
 * Deterministic pricing engine (pure — no DB, no AI).
 *
 * Rules (non-negotiable):
 *  - Every amount comes from an approved catalogue record or an active pricing rule. Nothing is guessed or defaulted.
 *  - If any required price/rule/rate is missing the result is MANUAL_REVIEW and NO totals are produced, so an incomplete
 *    quote can never be presented as a binding one.
 *  - All maths is done in the base currency (USD) and converted line by line at a configured, timestamped rate.
 */
import { BASE_CURRENCY, COMPLEXITIES, CURRENCIES, INTEGRATION_LABELS, type Complexity, type Currency, type SolutionRecord } from "./types";
import { z } from "zod";

export const PRICING_RULE_KINDS = [
  "COMPLEXITY_MULTIPLIER", "INTEGRATION_FEE", "THIRD_PARTY_API_FEE", "INFRASTRUCTURE_FEE", "TRAINING_FEE", "CUSTOM_DEV_RATE",
  "MIN_PROJECT_FEE", "DISCOUNT", "TAX", "APPROVAL_THRESHOLD", "MIN_MARGIN", "COST_RATE", "PAYMENT_SCHEDULE", "OPTIONAL_SERVICE",
] as const;
export type PricingRuleKind = (typeof PRICING_RULE_KINDS)[number];

/** Param shape per rule kind. Used to validate admin edits, so a malformed rule can never reach a calculation. */
export const RULE_PARAM_SCHEMAS: Record<PricingRuleKind, z.ZodType> = {
  COMPLEXITY_MULTIPLIER: z.object({ multiplier: z.number().min(0.1).max(10) }),
  INTEGRATION_FEE: z.object({ amount: z.number().min(0).max(1_000_000) }),
  THIRD_PARTY_API_FEE: z.object({ oneTime: z.number().min(0).default(0), monthly: z.number().min(0).default(0) }),
  INFRASTRUCTURE_FEE: z.object({ monthly: z.number().min(0).max(1_000_000) }),
  TRAINING_FEE: z.object({ perSession: z.number().min(0).max(1_000_000) }),
  CUSTOM_DEV_RATE: z.object({ hourly: z.number().min(0).max(10_000) }),
  MIN_PROJECT_FEE: z.object({ amount: z.number().min(0).max(10_000_000) }),
  DISCOUNT: z.object({ minAgents: z.number().int().min(1).max(100), percent: z.number().min(0).max(100) }),
  TAX: z.object({ name: z.string().min(1).max(40), percent: z.number().min(0).max(100), appliesTo: z.enum(["INITIAL", "RECURRING", "BOTH"]).default("BOTH") }),
  APPROVAL_THRESHOLD: z.object({ maxDiscountPercent: z.number().min(0).max(100).optional(), maxInitialTotal: z.number().min(0).optional() }),
  MIN_MARGIN: z.object({ percent: z.number().min(0).max(99) }),
  COST_RATE: z.object({ hourly: z.number().min(0).max(10_000) }),
  PAYMENT_SCHEDULE: z.object({ milestones: z.array(z.object({ label: z.string().min(1).max(80), percent: z.number().min(0).max(100) })).min(1).max(8) })
    .refine((v) => Math.abs(v.milestones.reduce((a, m) => a + m.percent, 0) - 100) < 0.001, { message: "Milestones must add up to 100%." }),
  OPTIONAL_SERVICE: z.object({ name: z.string().min(1).max(160), description: z.string().max(400).optional(), amount: z.number().min(0), recurring: z.boolean().default(false) }),
};

export interface PricingRuleRecord { kind: PricingRuleKind; key: string; label?: string; params: Record<string, unknown>; active: boolean }

export interface FxRate { rate: number; source: string; asOf: string }
export interface FxConfig { base: Currency; rates: Partial<Record<Currency, FxRate>> }

export interface QuoteSolutionInput { solution: SolutionRecord; complexity?: Complexity; quantity?: number }
export interface QuoteOptions {
  currency?: Currency;
  additionalDevHours?: number;
  trainingSessions?: number;
  optionalServices?: string[];
  /** Admin-applied discount (percent of implementation subtotal). */
  manualDiscountPercent?: number;
  manualDiscountReason?: string;
}
export interface QuoteInput { items: QuoteSolutionInput[]; rules: PricingRuleRecord[]; fx: FxConfig; options?: QuoteOptions; now?: Date }

export type LineKind = "IMPLEMENTATION" | "INTEGRATION" | "ADDITIONAL_DEV" | "TRAINING" | "INFRASTRUCTURE" | "OPTIONAL" | "MAINTENANCE" | "DISCOUNT" | "ADJUSTMENT" | "TAX";
export interface QuoteLine {
  kind: LineKind;
  solutionKey?: string;
  name: string;
  description?: string;
  quantity: number;
  complexity?: Complexity;
  /** Amounts in the quote currency. */
  unitPrice: number;
  total: number;
  recurring: boolean;
  /** Optional lines are shown but excluded from totals. */
  included: boolean;
  /** Which rule/record produced this number (for the snapshot audit trail). */
  source: string;
}

export interface QuoteResult {
  status: "COMPLETE" | "MANUAL_REVIEW";
  currency: Currency;
  baseCurrency: Currency;
  fx: { rate: number; source: string; asOf: string } | null;
  lines: QuoteLine[];
  missing: string[];
  notes: string[];
  initialSubtotal: number | null;
  discountTotal: number | null;
  taxTotal: number | null;
  initialTotal: number | null;
  monthlySubtotal: number | null;
  monthlyTax: number | null;
  monthlyTotal: number | null;
  paymentSchedule: Array<{ label: string; percent: number; amount: number }>;
  approval: { required: boolean; reasons: string[] };
  totalEstimatedHours: number | null;
  totalDeliveryWeeks: number | null;
  rulesApplied: Array<{ kind: string; key: string; params: Record<string, unknown> }>;
  calculatedAt: string;
}

export const money = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function ruleMap(rules: PricingRuleRecord[]) {
  const active = rules.filter((r) => r.active);
  const by = (kind: PricingRuleKind) => active.filter((r) => r.kind === kind);
  const one = (kind: PricingRuleKind, key: string) => active.find((r) => r.kind === kind && r.key === key);
  return { by, one };
}

export function calculateQuote(input: QuoteInput): QuoteResult {
  const now = input.now ?? new Date();
  const opts = input.options ?? {};
  const currency = opts.currency ?? BASE_CURRENCY;
  const { by, one } = ruleMap(input.rules);
  const missing: string[] = [];
  const notes: string[] = [];
  const used: QuoteResult["rulesApplied"] = [];
  const note = (r: PricingRuleRecord | undefined) => { if (r) used.push({ kind: r.kind, key: r.key, params: r.params }); return r; };
  const lines: QuoteLine[] = []; // built in BASE currency, converted at the end

  if (!CURRENCIES.includes(currency)) missing.push(`Currency "${currency}" is not supported.`);

  // ── FX ──
  let fx: QuoteResult["fx"] = null;
  let rate = 1;
  if (currency !== input.fx.base) {
    const r = input.fx.rates[currency];
    if (!r || !(r.rate > 0) || !r.source || !r.asOf) missing.push(`No approved exchange rate configured for ${currency} (needs rate, source and date).`);
    else { rate = r.rate; fx = { rate: r.rate, source: r.source, asOf: r.asOf }; }
  }

  if (input.items.length === 0) missing.push("No solutions selected.");

  // ── Solutions ──
  let hours = 0;
  let hoursKnown = true;
  let weeks = 0;
  let weeksKnown = true;
  const integrations = new Set<string>();
  let agentCount = 0;

  for (const it of input.items) {
    const s = it.solution;
    const qty = Math.max(1, Math.floor(it.quantity ?? 1));
    const complexity: Complexity = it.complexity && COMPLEXITIES.includes(it.complexity) ? it.complexity : s.defaultComplexity;
    agentCount += qty;
    s.integrations.forEach((i) => integrations.add(i));

    if (!s.active) { missing.push(`Solution "${s.name}" is inactive.`); continue; }
    if (!s.complexityLevels.includes(complexity)) { missing.push(`Solution "${s.name}" does not offer ${complexity} complexity.`); continue; }
    const mult = note(one("COMPLEXITY_MULTIPLIER", complexity));
    const multiplier = num(mult?.params.multiplier);
    if (multiplier == null) { missing.push(`No complexity multiplier configured for ${complexity}.`); }
    if (s.basePrice == null) { missing.push(`"${s.name}" has no approved price.`); }

    if (s.estimatedHours != null) hours += s.estimatedHours * qty; else hoursKnown = false;
    if (s.deliveryWeeks != null) weeks = Math.max(weeks, s.deliveryWeeks); else weeksKnown = false;

    if (s.basePrice != null && multiplier != null) {
      let unit = s.basePrice * multiplier;
      let total: number;
      if (s.pricingMethod === "HOURLY") {
        if (s.estimatedHours == null) { missing.push(`"${s.name}" is hourly-priced but has no estimated hours.`); continue; }
        unit = s.basePrice * multiplier * s.estimatedHours;
        total = unit * qty;
      } else total = unit * qty; // FIXED and PER_UNIT both multiply by quantity (FIXED defaults to 1)
      lines.push({ kind: "IMPLEMENTATION", solutionKey: s.key, name: s.name, description: s.description, quantity: qty, complexity, unitPrice: money(unit), total: money(total), recurring: false, included: true, source: `catalogue:${s.key}${mult ? "+multiplier:" + complexity : ""}` });
    }

    // Monthly maintenance
    if (s.monthlyMaintenance == null) missing.push(`"${s.name}" has no approved monthly maintenance price (enter 0 if none).`);
    else lines.push({ kind: "MAINTENANCE", solutionKey: s.key, name: `${s.name} — monthly support & maintenance`, quantity: qty, unitPrice: money(s.monthlyMaintenance), total: money(s.monthlyMaintenance * qty), recurring: true, included: true, source: `catalogue:${s.key}:maintenance` });
  }

  // ── Integrations ──
  for (const key of [...integrations].sort()) {
    const label = INTEGRATION_LABELS[key] ?? key;
    const fee = note(one("INTEGRATION_FEE", key));
    const amount = num(fee?.params.amount);
    if (amount == null) { missing.push(`No approved integration fee for "${label}".`); continue; }
    lines.push({ kind: "INTEGRATION", name: `Integration: ${label}`, quantity: 1, unitPrice: money(amount), total: money(amount), recurring: false, included: true, source: `rule:INTEGRATION_FEE:${key}` });
    const api = note(one("THIRD_PARTY_API_FEE", key));
    if (api) {
      const once = num(api.params.oneTime) ?? 0;
      const monthly = num(api.params.monthly) ?? 0;
      if (once > 0) lines.push({ kind: "INTEGRATION", name: `Third-party API set-up: ${label}`, quantity: 1, unitPrice: money(once), total: money(once), recurring: false, included: true, source: `rule:THIRD_PARTY_API_FEE:${key}` });
      if (monthly > 0) lines.push({ kind: "INFRASTRUCTURE", name: `Third-party API / usage: ${label}`, quantity: 1, unitPrice: money(monthly), total: money(monthly), recurring: true, included: true, source: `rule:THIRD_PARTY_API_FEE:${key}` });
    }
  }

  // ── Additional development ──
  const devHours = Math.max(0, opts.additionalDevHours ?? 0);
  if (devHours > 0) {
    const r = note(one("CUSTOM_DEV_RATE", "default"));
    const hourly = num(r?.params.hourly);
    if (hourly == null) missing.push("Additional development requested but no custom-development hourly rate is configured.");
    else {
      lines.push({ kind: "ADDITIONAL_DEV", name: "Additional custom development", quantity: devHours, unitPrice: money(hourly), total: money(hourly * devHours), recurring: false, included: true, source: "rule:CUSTOM_DEV_RATE" });
      hours += devHours;
    }
  }

  // ── Training ──
  const trainingRule = note(one("TRAINING_FEE", "default"));
  const sessions = Math.max(0, Math.floor(opts.trainingSessions ?? (trainingRule ? 1 : 0)));
  if (sessions > 0) {
    const per = num(trainingRule?.params.perSession);
    if (per == null) missing.push("Training requested but no training fee is configured.");
    else lines.push({ kind: "TRAINING", name: "Staff training session", quantity: sessions, unitPrice: money(per), total: money(per * sessions), recurring: false, included: true, source: "rule:TRAINING_FEE" });
  } else if (!trainingRule) notes.push("No training fee configured; no training charge included.");

  // ── Infrastructure (monthly) ──
  const infra = note(one("INFRASTRUCTURE_FEE", "default"));
  const infraMonthly = num(infra?.params.monthly);
  if (infraMonthly != null && infraMonthly > 0) lines.push({ kind: "INFRASTRUCTURE", name: "Hosting, infrastructure & usage", quantity: 1, unitPrice: money(infraMonthly), total: money(infraMonthly), recurring: true, included: true, source: "rule:INFRASTRUCTURE_FEE" });

  // ── Optional services (shown, not totalled) ──
  for (const key of opts.optionalServices ?? []) {
    const r = note(one("OPTIONAL_SERVICE", key));
    if (!r) { missing.push(`Optional service "${key}" is not an approved option.`); continue; }
    const amount = num(r.params.amount) ?? 0;
    lines.push({ kind: "OPTIONAL", name: String(r.params.name ?? key), description: typeof r.params.description === "string" ? r.params.description : undefined, quantity: 1, unitPrice: money(amount), total: money(amount), recurring: !!r.params.recurring, included: false, source: `rule:OPTIONAL_SERVICE:${key}` });
  }

  // ── Payment schedule ──
  const scheduleRule = note(one("PAYMENT_SCHEDULE", "default"));
  const milestones = Array.isArray(scheduleRule?.params.milestones) ? (scheduleRule!.params.milestones as Array<{ label: string; percent: number }>) : null;
  if (!milestones) missing.push("No payment schedule is configured.");

  const approvalReasons: string[] = [];
  const result: QuoteResult = {
    status: "MANUAL_REVIEW", currency, baseCurrency: input.fx.base, fx, lines: [], missing, notes, initialSubtotal: null, discountTotal: null, taxTotal: null, initialTotal: null,
    monthlySubtotal: null, monthlyTax: null, monthlyTotal: null, paymentSchedule: [], approval: { required: false, reasons: approvalReasons },
    totalEstimatedHours: hoursKnown ? hours : null, totalDeliveryWeeks: weeksKnown && input.items.length ? weeks : null, rulesApplied: dedupe(used), calculatedAt: now.toISOString(),
  };

  const convert = (l: QuoteLine): QuoteLine => ({ ...l, unitPrice: money(l.unitPrice * rate), total: money(l.total * rate) });

  if (missing.length > 0) {
    // Show what could be priced (for the admin) but produce NO totals.
    result.lines = lines.map(convert);
    result.approval = { required: true, reasons: ["Manual pricing review required — see missing items."] };
    return result;
  }

  // ── Totals in base currency ──
  const included = lines.filter((l) => l.included);
  const oneTime = included.filter((l) => !l.recurring);
  const recurring = included.filter((l) => l.recurring);
  let oneTimeSubtotal = oneTime.reduce((a, l) => a + l.total, 0);

  // Minimum project fee
  const minFee = note(one("MIN_PROJECT_FEE", "default"));
  const minAmount = num(minFee?.params.amount);
  if (minAmount != null && oneTimeSubtotal < minAmount) {
    const adj = minAmount - oneTimeSubtotal;
    lines.push({ kind: "ADJUSTMENT", name: "Minimum project fee adjustment", quantity: 1, unitPrice: money(adj), total: money(adj), recurring: false, included: true, source: "rule:MIN_PROJECT_FEE" });
    oneTimeSubtotal = minAmount;
  }

  // Discounts: best volume discount + manual discount, both on the one-time subtotal
  let discountPct = 0;
  const volume = by("DISCOUNT").filter((r) => agentCount >= (num(r.params.minAgents) ?? Infinity)).sort((a, b) => (num(b.params.percent) ?? 0) - (num(a.params.percent) ?? 0))[0];
  if (volume) { note(volume); discountPct += num(volume.params.percent) ?? 0; }
  const manual = Math.max(0, opts.manualDiscountPercent ?? 0);
  discountPct = Math.min(100, discountPct + manual);
  let discount = 0;
  if (discountPct > 0) {
    discount = money(oneTimeSubtotal * (discountPct / 100));
    lines.push({ kind: "DISCOUNT", name: manual > 0 && opts.manualDiscountReason ? `Discount (${opts.manualDiscountReason})` : `Discount (${discountPct}%)`, quantity: 1, unitPrice: -discount, total: -discount, recurring: false, included: true, source: volume ? `rule:DISCOUNT:${volume.key}${manual ? "+manual" : ""}` : "manual" });
  }
  const initialAfterDiscount = oneTimeSubtotal - discount;
  const monthlySubtotal = recurring.reduce((a, l) => a + l.total, 0);

  // Taxes
  let initialTax = 0;
  let monthlyTax = 0;
  for (const t of by("TAX")) {
    note(t);
    const pct = (num(t.params.percent) ?? 0) / 100;
    const applies = String(t.params.appliesTo ?? "BOTH");
    if (applies !== "RECURRING") {
      const amt = money(initialAfterDiscount * pct);
      if (amt) { initialTax += amt; lines.push({ kind: "TAX", name: `${String(t.params.name)} (${t.params.percent}%) — implementation`, quantity: 1, unitPrice: amt, total: amt, recurring: false, included: true, source: `rule:TAX:${t.key}` }); }
    }
    if (applies !== "INITIAL") {
      const amt = money(monthlySubtotal * pct);
      if (amt) { monthlyTax += amt; lines.push({ kind: "TAX", name: `${String(t.params.name)} (${t.params.percent}%) — monthly`, quantity: 1, unitPrice: amt, total: amt, recurring: true, included: true, source: `rule:TAX:${t.key}` }); }
    }
  }

  // Approval controls
  const threshold = note(one("APPROVAL_THRESHOLD", "default"));
  const maxDisc = num(threshold?.params.maxDiscountPercent);
  const maxTotal = num(threshold?.params.maxInitialTotal);
  if (maxDisc != null && discountPct > maxDisc) approvalReasons.push(`Discount ${discountPct}% exceeds the authorised ${maxDisc}%.`);
  if (maxTotal != null && initialAfterDiscount > maxTotal) approvalReasons.push(`Initial total exceeds the approval limit of ${maxTotal} ${input.fx.base}.`);
  const margin = note(one("MIN_MARGIN", "default"));
  const cost = note(one("COST_RATE", "default"));
  const minMargin = num(margin?.params.percent);
  const costRate = num(cost?.params.hourly);
  if (minMargin != null && costRate != null && hoursKnown && initialAfterDiscount > 0) {
    const m = ((initialAfterDiscount - hours * costRate) / initialAfterDiscount) * 100;
    if (m < minMargin) approvalReasons.push(`Estimated margin ${m.toFixed(1)}% is below the minimum ${minMargin}%.`);
  } else notes.push("Margin check skipped: minimum margin, cost rate or estimated hours not configured.");

  const initialTotal = money(initialAfterDiscount + initialTax);
  const monthlyTotal = money(monthlySubtotal + monthlyTax);

  // Payment schedule: last milestone absorbs rounding so the schedule always sums exactly.
  let allocated = 0;
  const schedule = milestones!.map((m, i, arr) => {
    const raw = i === arr.length - 1 ? money(initialTotal * rate - allocated) : money(initialTotal * rate * (m.percent / 100));
    allocated = money(allocated + raw);
    return { label: m.label, percent: m.percent, amount: raw };
  });

  result.status = "COMPLETE";
  result.lines = lines.map(convert);
  result.initialSubtotal = money(oneTimeSubtotal * rate);
  result.discountTotal = money(discount * rate);
  result.taxTotal = money((initialTax + monthlyTax) * rate);
  result.initialTotal = money(initialTotal * rate);
  result.monthlySubtotal = money(monthlySubtotal * rate);
  result.monthlyTax = money(monthlyTax * rate);
  result.monthlyTotal = money(monthlyTotal * rate);
  result.paymentSchedule = schedule;
  result.approval = { required: approvalReasons.length > 0, reasons: approvalReasons };
  result.rulesApplied = dedupe(used);
  return result;
}

function dedupe(items: QuoteResult["rulesApplied"]) {
  const seen = new Set<string>();
  return items.filter((i) => { const k = `${i.kind}:${i.key}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Validate an admin-supplied rule before it is stored. Throws ZodError. */
export function validateRuleParams(kind: PricingRuleKind, params: unknown): Record<string, unknown> {
  return RULE_PARAM_SCHEMAS[kind].parse(params) as Record<string, unknown>;
}

export function formatMoney(amount: number | null | undefined, currency: string): string {
  if (amount == null) return "—";
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
}
