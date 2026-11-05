import { CHANNEL_LABEL } from "./classify";
import { pctChange } from "./ranges";
import type { DimRow, PageRow, Totals } from "./queries";

export interface Insight { kind: "observation" | "recommendation"; severity: "info" | "positive" | "warning"; text: string }

/** Minimum samples before any statement is made — small numbers produce noise, not insight. */
export const MIN = { channelSessions: 30, pageVisitors: 100, deviceSessions: 100, totalSessions: 50 };

export interface InsightInput {
  cur: Totals; prev: Totals; channels: DimRow[]; prevChannels: DimRow[]; pages: PageRow[]; devices: DimRow[];
}

/** Facts come straight from stored data (kind "observation"). Anything inferred is labelled "recommendation" and phrased as an estimate. */
export function buildInsights(i: InsightInput): Insight[] {
  const out: Insight[] = [];
  if (i.cur.sessions < MIN.totalSessions) return out;

  const prevMap = new Map(i.prevChannels.map((c) => [c.key, c]));
  for (const c of i.channels) {
    const p = prevMap.get(c.key);
    if (!p || p.sessions < MIN.channelSessions) continue;
    const ch = pctChange(c.sessions, p.sessions);
    if (ch !== null && Math.abs(ch) >= 20) {
      out.push({ kind: "observation", severity: ch > 0 ? "positive" : "warning", text: `${CHANNEL_LABEL[c.key] ?? c.key} traffic ${ch > 0 ? "increased" : "decreased"} by ${Math.abs(ch)}% compared with the previous period (${p.sessions} → ${c.sessions} sessions).` });
    }
  }

  for (const pg of i.pages) {
    if (pg.uniqueVisitors >= MIN.pageVisitors && pg.conversionRate < 1.5) {
      out.push({ kind: "observation", severity: "warning", text: `${pg.path} attracted ${pg.uniqueVisitors} visitors but only ${pg.leadsAssisted} of its ${pg.sessions} sessions produced an enquiry (${pg.conversionRate}%).` });
      out.push({ kind: "recommendation", severity: "info", text: `Estimate, not a measured fact: ${pg.path} may need a clearer call to action${pg.formStarts === 0 ? " — nobody started a form from it" : ""}.` });
      break;
    }
  }

  const byDevice = new Map(i.devices.map((d) => [d.key, d]));
  const m = byDevice.get("mobile"), d = byDevice.get("desktop");
  if (m && d && m.sessions >= MIN.deviceSessions && d.sessions >= MIN.deviceSessions && d.conversionRate > 0 && m.conversionRate < d.conversionRate * 0.75) {
    out.push({ kind: "observation", severity: "warning", text: `Mobile visitors have a lower conversion rate (${m.conversionRate}%) than desktop visitors (${d.conversionRate}%).` });
  }

  const lead = pctChange(i.cur.convertedSessions, i.prev.convertedSessions);
  if (i.prev.sessions >= MIN.totalSessions && lead !== null && Math.abs(lead) >= 25) {
    out.push({ kind: "observation", severity: lead > 0 ? "positive" : "warning", text: `Converting sessions ${lead > 0 ? "rose" : "fell"} by ${Math.abs(lead)}% versus the previous period (${i.prev.convertedSessions} → ${i.cur.convertedSessions}).` });
  }
  return out.slice(0, 8);
}
