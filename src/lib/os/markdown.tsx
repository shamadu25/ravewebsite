import type { ReactNode } from "react";

/**
 * Tiny Markdown → React renderer for AI-drafted articles. It builds React elements directly (never raw HTML), so a
 * model — or anyone — cannot inject scripts. Supports headings, paragraphs, bullet/numbered lists, **bold**, *italic*
 * and http(s)/relative links.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0, i = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0], k = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("[")) {
      const [, label, href] = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(tok) ?? [];
      const safe = /^(https?:\/\/|\/)/i.test(href ?? "");
      out.push(safe ? <a key={k} href={href} rel="noopener noreferrer">{label}</a> : label);
    } else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderMarkdown(md: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  const lines = md.replace(/\r/g, "").split("\n");
  let para: string[] = [], list: { ordered: boolean; items: string[] } | null = null, n = 0;
  const flushPara = () => { if (para.length) { blocks.push(<p key={`p${n++}`}>{inline(para.join(" "), `p${n}`)}</p>); para = []; } };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((t, j) => <li key={j}>{inline(t, `l${n}-${j}`)}</li>);
    blocks.push(list.ordered ? <ol key={`l${n++}`}>{items}</ol> : <ul key={`l${n++}`}>{items}</ul>);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    const ul = /^[-*•]\s+(.*)$/.exec(line), ol = /^\d+[.)]\s+(.*)$/.exec(line);
    if (!line) { flushPara(); flushList(); continue; }
    if (h) { flushPara(); flushList(); const lvl = Math.min(4, Math.max(2, h[1].length + 1)); const Tag = (`h${lvl}`) as "h2" | "h3" | "h4"; blocks.push(<Tag key={`h${n++}`}>{inline(h[2], `h${n}`)}</Tag>); continue; }
    if (ul || ol) { flushPara(); const ordered = !!ol; if (list && list.ordered !== ordered) flushList(); list = list ?? { ordered, items: [] }; list.items.push((ul ?? ol)![1]); continue; }
    flushList(); para.push(line);
  }
  flushPara(); flushList();
  return blocks;
}

/** URL-safe slug from a title. */
export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80).replace(/^-|-$/g, "");
export const readTimeOf = (md: string) => `${Math.max(1, Math.round(md.split(/\s+/).length / 220))} min read`;
