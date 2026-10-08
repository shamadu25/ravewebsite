/** Server-side clock helpers (kept out of components so render stays pure). */
export const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);
export const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000);
export const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
