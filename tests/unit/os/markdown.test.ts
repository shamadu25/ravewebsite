/** @jest-environment node */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readTimeOf, renderMarkdown, slugify } from "@/lib/os/markdown";

const html = (md: string) => renderToStaticMarkup(createElement("div", null, ...renderMarkdown(md)));

describe("article Markdown renderer", () => {
  it("renders headings, paragraphs, lists, bold, italic and safe links", () => {
    const out = html("# Title\n\nIntro with **bold** and *italic* and [a link](https://ravesoftsolutions.com).\n\n## Steps\n\n- one\n- two\n\n1. first\n2. second");
    expect(out).toContain("<h2>Title</h2>");          // article h1 is the page title, so # becomes h2
    expect(out).toContain("<h3>Steps</h3>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>italic</em>");
    expect(out).toContain('<a href="https://ravesoftsolutions.com" rel="noopener noreferrer">a link</a>');
    expect(out).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(out).toContain("<ol><li>first</li><li>second</li></ol>");
  });
  it("cannot be used to inject HTML or script", () => {
    const out = html('<script>alert(1)</script> <img src=x onerror=alert(1)> [x](javascript:alert(1)) [y](data:text/html,hi)');
    expect(out).not.toMatch(/<script|<img|href="javascript|href="data/i);
    expect(out).toContain("&lt;script&gt;");           // shown as inert text
  });
  it("slugifies titles and estimates reading time", () => {
    expect(slugify("Best POS System in Ghana (2026)!")).toBe("best-pos-system-in-ghana-2026");
    expect(slugify("  Café — Stock & Sales  ")).toBe("cafe-stock-sales");
    expect(readTimeOf("word ".repeat(660))).toBe("3 min read");
    expect(readTimeOf("short")).toBe("1 min read");
  });
});
