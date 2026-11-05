/**
 * Minimal dependency-free PDF writer (Helvetica, A4). Deliberately tiny: the proposal needs headings, paragraphs, bullets,
 * tables and coloured bands — nothing that justifies a new dependency or bundled font files on Vercel.
 * All text is treated as data: it is encoded and escaped, never interpreted, so customer-supplied content cannot inject PDF syntax.
 */
const W = 595.28;
const H = 841.89;

// Helvetica / Helvetica-Bold advance widths (1/1000 em) for ASCII 32..126.
const HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HELV_B = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

const CP1252: Record<number, number> = { 0x20ac: 0x80, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2122: 0x99 };

function toWinAnsi(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    if (c === 9 || c === 10) out += " ";
    else if (c >= 32 && c < 127) out += ch;
    else if (c >= 160 && c <= 255) out += ch;
    else if (CP1252[c]) out += String.fromCharCode(CP1252[c]);
    else out += "?";
  }
  return out;
}
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export function textWidth(s: string, size: number, bold = false): number {
  const t = bold ? HELV_B : HELV;
  let w = 0;
  for (const ch of toWinAnsi(s)) { const c = ch.charCodeAt(0); w += c >= 32 && c <= 126 ? t[c - 32] : 556; }
  return (w * size) / 1000;
}

function rgb(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(" ");
}

export function wrap(text: string, maxWidth: number, size: number, bold = false): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    if (!para.trim()) { lines.push(""); continue; }
    let line = "";
    for (const word of para.split(/\s+/)) {
      // Break very long unbroken tokens (e.g. URLs) so they can never overflow the page.
      const pieces: string[] = [];
      let rest = word;
      while (textWidth(rest, size, bold) > maxWidth) {
        let n = rest.length;
        while (n > 1 && textWidth(rest.slice(0, n), size, bold) > maxWidth) n--;
        pieces.push(rest.slice(0, n)); rest = rest.slice(n);
      }
      pieces.push(rest);
      for (const p of pieces) {
        const test = line ? `${line} ${p}` : p;
        if (textWidth(test, size, bold) <= maxWidth) line = test;
        else { if (line) lines.push(line); line = p; }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export const COLORS = { blue: "#060297", navy: "#071536", amber: "#FFB200", text: "#172033", muted: "#64748B", light: "#F7F9FC", line: "#E2E8F0", white: "#FFFFFF" };

export interface PdfOptions { title: string; footerLeft: string; author?: string }
type Op = string;

export class PdfDoc {
  private pages: Op[][] = [];
  private ops: Op[] = [];
  y = 0;
  readonly margin = 54;
  readonly contentWidth = W - 108;
  private cover = false;
  constructor(private opts: PdfOptions) { this.newPage(); }

  newPage(): void {
    if (this.ops.length || this.pages.length) this.pages.push(this.ops);
    this.ops = [];
    this.y = 70;
  }
  get pageCount() { return this.pages.length + 1; }

  private ensure(h: number) { if (this.y + h > H - 70) this.newPage(); }

  rect(x: number, yTop: number, w: number, h: number, color: string): void {
    this.ops.push(`${rgb(color)} rg ${x.toFixed(2)} ${(H - yTop - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }
  private line(x1: number, y1: number, x2: number, color: string, width = 0.6) {
    this.ops.push(`${rgb(color)} RG ${width} w ${x1.toFixed(2)} ${(H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(H - y1).toFixed(2)} l S`);
  }
  text(s: string, x: number, yTop: number, o: { size?: number; bold?: boolean; color?: string; align?: "left" | "right" | "center"; width?: number } = {}): void {
    const size = o.size ?? 10;
    let px = x;
    const w = textWidth(s, size, o.bold);
    if (o.align === "right") px = x + (o.width ?? 0) - w;
    if (o.align === "center") px = x + ((o.width ?? 0) - w) / 2;
    this.ops.push(`BT /${o.bold ? "F2" : "F1"} ${size} Tf ${rgb(o.color ?? COLORS.text)} rg ${px.toFixed(2)} ${(H - yTop - size * 0.8).toFixed(2)} Td (${esc(toWinAnsi(s))}) Tj ET`);
  }

  coverPage(o: { eyebrow: string; title: string; subtitle: string; meta: Array<[string, string]>; footer: string }): void {
    this.rect(0, 0, W, 330, COLORS.blue);
    this.rect(0, 330, W, 6, COLORS.amber);
    this.text("RAVESOFT DIGITAL SOLUTIONS LTD.", this.margin, 70, { size: 11, bold: true, color: COLORS.amber });
    this.text(o.eyebrow, this.margin, 150, { size: 11, color: "#C7D2FE" });
    let y = 172;
    for (const l of wrap(o.title, this.contentWidth, 28, true)) { this.text(l, this.margin, y, { size: 28, bold: true, color: COLORS.white }); y += 34; }
    y += 6;
    for (const l of wrap(o.subtitle, this.contentWidth, 13)) { this.text(l, this.margin, y, { size: 13, color: "#E0E7FF" }); y += 18; }
    let my = 390;
    for (const [k, v] of o.meta) {
      this.text(k.toUpperCase(), this.margin, my, { size: 8, bold: true, color: COLORS.muted });
      for (const l of wrap(v, this.contentWidth, 12, true)) { this.text(l, this.margin, my + 13, { size: 12, bold: true, color: COLORS.navy }); my += 15; }
      my += 30;
    }
    this.text(o.footer, this.margin, H - 60, { size: 9, color: COLORS.muted });
    this.cover = true;
    this.newPage();
  }

  heading(s: string, level: 1 | 2 = 1): void {
    const size = level === 1 ? 16 : 12;
    this.ensure(size + 40);
    if (level === 1) { this.y += 10; this.rect(this.margin, this.y, 4, size + 2, COLORS.amber); this.text(s, this.margin + 12, this.y, { size, bold: true, color: COLORS.navy }); this.y += size + 14; }
    else { this.y += 6; this.text(s, this.margin, this.y, { size, bold: true, color: COLORS.blue }); this.y += size + 6; }
  }

  paragraph(s: string, o: { size?: number; color?: string; bold?: boolean; indent?: number; after?: number } = {}): void {
    const size = o.size ?? 10;
    const lh = size * 1.5;
    const x = this.margin + (o.indent ?? 0);
    for (const l of wrap(s, this.contentWidth - (o.indent ?? 0), size, o.bold)) {
      this.ensure(lh);
      if (l) this.text(l, x, this.y, { size, color: o.color, bold: o.bold });
      this.y += lh;
    }
    this.y += o.after ?? 6;
  }

  bullets(items: string[], size = 10): void {
    for (const it of items) {
      const lines = wrap(it, this.contentWidth - 16, size);
      this.ensure(size * 1.5);
      this.rect(this.margin + 2, this.y + size * 0.35, 3, 3, COLORS.amber);
      lines.forEach((l, i) => { if (i > 0) this.ensure(size * 1.5); this.text(l, this.margin + 14, this.y, { size }); this.y += size * 1.5; });
    }
    this.y += 4;
  }

  keyValues(rows: Array<[string, string]>): void {
    for (const [k, v] of rows) {
      const lines = wrap(v || "—", this.contentWidth - 140, 10);
      this.ensure(lines.length * 15 + 4);
      this.text(k, this.margin, this.y, { size: 9, bold: true, color: COLORS.muted });
      lines.forEach((l) => { this.text(l, this.margin + 140, this.y, { size: 10 }); this.y += 15; });
      this.y += 2;
    }
    this.y += 4;
  }

  table(cols: Array<{ header: string; width: number; align?: "left" | "right" }>, rows: string[][], o: { boldLast?: boolean } = {}): void {
    const total = cols.reduce((a, c) => a + c.width, 0);
    const scale = this.contentWidth / total;
    const widths = cols.map((c) => c.width * scale);
    const draw = (cells: string[], header: boolean, bold: boolean) => {
      const wrapped = cells.map((c, i) => wrap(c, widths[i] - 12, 9, header || bold));
      const rowH = Math.max(...wrapped.map((w) => w.length)) * 13 + 10;
      this.ensure(rowH + 2);
      if (header) this.rect(this.margin, this.y, this.contentWidth, rowH, COLORS.navy);
      let x = this.margin;
      wrapped.forEach((lines, i) => {
        lines.forEach((l, li) => this.text(l, x + 6, this.y + 6 + li * 13, { size: 9, bold: header || bold, color: header ? COLORS.white : COLORS.text, align: cols[i].align, width: widths[i] - 12 }));
        x += widths[i];
      });
      this.y += rowH;
      if (!header) this.line(this.margin, this.y, this.margin + this.contentWidth, COLORS.line);
    };
    draw(cols.map((c) => c.header), true, false);
    rows.forEach((r, i) => draw(r, false, !!o.boldLast && i === rows.length - 1));
    this.y += 10;
  }

  callout(s: string, color = COLORS.light): void {
    const lines = wrap(s, this.contentWidth - 24, 10);
    const h = lines.length * 15 + 16;
    this.ensure(h);
    this.rect(this.margin, this.y, this.contentWidth, h, color);
    this.rect(this.margin, this.y, 3, h, COLORS.amber);
    lines.forEach((l, i) => this.text(l, this.margin + 14, this.y + 8 + i * 15, { size: 10 }));
    this.y += h + 8;
  }

  /** Serialise to a PDF byte buffer. */
  build(): Buffer {
    this.pages.push(this.ops);
    this.ops = [];
    const total = this.pages.length;
    const objects: Buffer[] = [];
    const add = (s: string | Buffer) => { objects.push(Buffer.isBuffer(s) ? s : Buffer.from(s, "latin1")); return objects.length; };

    add("<< /Type /Catalog /Pages 2 0 R >>");
    const pageObjStart = 5;
    const kids = this.pages.map((_, i) => `${pageObjStart + i * 2} 0 R`).join(" ");
    add(`<< /Type /Pages /Kids [${kids}] /Count ${total} >>`);
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

    this.pages.forEach((ops, i) => {
      const footer: string[] = [];
      if (i > 0) { // no footer on the cover
        this.ops = footer;
        this.line(this.margin, H - 50, W - this.margin, COLORS.line);
        this.text(this.opts.footerLeft, this.margin, H - 42, { size: 8, color: COLORS.muted });
        this.text(`Page ${i + 1} of ${total}`, this.margin, H - 42, { size: 8, color: COLORS.muted, align: "right", width: this.contentWidth });
        if (i > 0) this.rect(0, 0, W, 8, COLORS.blue);
      }
      const stream = Buffer.from([...ops, ...footer].join("\n"), "latin1");
      add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageObjStart + i * 2 + 1} 0 R >>`);
      add(Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "latin1"), stream, Buffer.from("\nendstream", "latin1")]));
    });
    const info = add(`<< /Title (${esc(toWinAnsi(this.opts.title))}) /Producer (RaveSoft AI Automation) /Author (${esc(toWinAnsi(this.opts.author ?? "RaveSoft Digital Solutions Ltd"))}) >>`);

    const parts: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
    const offsets: number[] = [];
    let pos = parts[0].length;
    objects.forEach((o, i) => {
      offsets.push(pos);
      const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, "latin1"), o, Buffer.from("\nendobj\n", "latin1")]);
      parts.push(b); pos += b.length;
    });
    const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
    parts.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${pos}\n%%EOF\n`, "latin1"));
    return Buffer.concat(parts);
  }
}
