export const fmtDate = (d: Date | string | null | undefined) => (d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");
export const fmtDay = (d: Date | string | null | undefined) => (d ? new Date(d).toLocaleDateString("en-GB", { dateStyle: "medium" }) : "—");
export const human = (s: string | null | undefined) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "—");
export const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
