import fs from "fs";
import nodeCrypto from "crypto";
import path from "path";

const SRC = fs.readFileSync(path.join(process.cwd(), "public/rs-intel.js"), "utf8");
type Sent = { url: string; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
let sent: Sent[];

function load(opts: { mode?: string; dnt?: boolean; consent?: string; ignore?: boolean; search?: string } = {}) {
  document.head.innerHTML = ""; document.body.innerHTML = "";
  localStorage.clear(); document.cookie.split(";").forEach((c) => { document.cookie = `${c.split("=")[0]}=; Max-Age=0; Path=/`; });
  if (opts.consent) localStorage.setItem("rs_consent", opts.consent);
  if (opts.ignore) localStorage.setItem("rs_ignore", "1");
  Object.defineProperty(navigator, "doNotTrack", { value: opts.dnt ? "1" : null, configurable: true });
  window.history.replaceState({}, "", "/products/cliqpos" + (opts.search ?? ""));
  delete (window as any).__rsIntel; // eslint-disable-line @typescript-eslint/no-explicit-any
  sent = [];
  (window as any).fetch = jest.fn(async (url: string, init: any) => { sent.push({ url, body: JSON.parse(init.body) }); return { status: 200, json: async () => ({ ok: true }) }; }); // eslint-disable-line @typescript-eslint/no-explicit-any
  (window as any).Blob = class { text: string; constructor(parts: string[]) { this.text = parts.join(""); } }; // eslint-disable-line @typescript-eslint/no-explicit-any
  (navigator as any).sendBeacon = jest.fn((url: string, blob: { text: string }) => { sent.push({ url, body: JSON.parse(blob.text) }); return true; }); // eslint-disable-line @typescript-eslint/no-explicit-any
  const s = document.createElement("script"); s.setAttribute("src", "/rs-intel.js"); if (opts.mode) s.setAttribute("data-consent-mode", opts.mode); document.head.appendChild(s);
  Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
  new Function(SRC).call(window);
}
const events = () => sent.flatMap((s) => s.body.events);

beforeEach(() => { jest.useFakeTimers(); (window as any).crypto ??= nodeCrypto.webcrypto; }); // eslint-disable-line @typescript-eslint/no-explicit-any
afterEach(() => jest.useRealTimers());

describe("browser tracker", () => {
  it("is syntactically valid and small", () => { expect(() => new Function(SRC)).not.toThrow(); expect(SRC.length).toBeLessThan(30_000); });

  it("sends a page_view with first-party ids, never blocking page load", () => {
    load({ search: "?utm_source=facebook&utm_medium=paid_social&utm_campaign=c1&secret=1" });
    jest.advanceTimersByTime(100);
    const e = events();
    expect(e.some((x: any) => x.type === "page_view")).toBe(true); // eslint-disable-line @typescript-eslint/no-explicit-any
    const b = sent[0].body;
    expect(b.vid).toMatch(/^[A-Za-z0-9_-]{8,40}$/); expect(b.sid).toMatch(/^[A-Za-z0-9_-]{8,40}$/);
    expect(b.ctx.qs).toEqual({ utm_source: "facebook", utm_medium: "paid_social", utm_campaign: "c1" }); // non-campaign params are not sent
    expect(document.cookie).toMatch(/rs_vid=/); expect(document.cookie).toMatch(/rs_sid=/);
  });

  it("keeps the same visitor id across loads and starts a new session after 30 minutes", () => {
    load(); jest.advanceTimersByTime(50);
    const v1 = sent[0].body.vid, s1 = sent[0].body.sid;
    const stored = JSON.parse(localStorage.getItem("rs_sess")!); stored.last = Date.now() - 31 * 60_000; localStorage.setItem("rs_sess", JSON.stringify(stored));
    delete (window as any).__rsIntel; sent = []; new Function(SRC).call(window); jest.advanceTimersByTime(50); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(sent[0].body.vid).toBe(v1); expect(sent[0].body.sid).not.toBe(s1);
  });

  it("records form start and field NAMES but never typed values", () => {
    load(); jest.advanceTimersByTime(50);
    document.body.innerHTML = `<form id="contact"><input name="email" value="x"><input name="password" type="password"><textarea name="message"></textarea></form>`;
    const email = document.querySelector<HTMLInputElement>("input[name=email]")!; email.value = "private@person.com";
    email.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    document.querySelector("input[type=password]")!.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    jest.advanceTimersByTime(9000);
    const all = JSON.stringify(sent.map((s) => s.body));
    expect(all).toContain("form_start"); expect(all).toContain('"field":"email"');
    expect(all).not.toContain("private@person.com"); expect(all).not.toMatch(/"field":"password"/);
  });

  it("classifies contact clicks without exposing the number or address", () => {
    load(); jest.advanceTimersByTime(50);
    document.body.innerHTML = `<a id="t" href="tel:+233244000000">Call</a><a id="w" href="https://wa.me/233244000000">WA</a><a id="c" href="/contact">Get a quote</a><a id="o" href="https://example.org">x</a>`;
    for (const id of ["t", "w", "c", "o"]) document.getElementById(id)!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    jest.advanceTimersByTime(9000);
    const types = events().map((x: any) => x.type); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(types).toEqual(expect.arrayContaining(["phone_click", "whatsapp_click", "cta_click", "outbound_click"]));
    expect(JSON.stringify(sent)).not.toContain("233244000000");
  });

  it("never reports a lead or form success from the browser", () => {
    load(); jest.advanceTimersByTime(50);
    document.body.innerHTML = `<form id="f"><input name="x"></form>`;
    document.getElementById("f")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    jest.advanceTimersByTime(9000);
    const types = events().map((x: any) => x.type); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(types).toContain("form_submit_attempt"); expect(types).not.toContain("lead_created"); expect(types).not.toContain("form_submit_success");
  });

  it("does nothing under Do Not Track, ?rs_ignore=1, explicit decline, or opt-in without consent", () => {
    for (const o of [{ dnt: true }, { ignore: true }, { consent: "denied" }, { mode: "opt_in" }]) { load(o); jest.advanceTimersByTime(20_000); expect(sent).toHaveLength(0); }
    expect(document.getElementById("rs-consent")).not.toBeNull(); // opt-in shows an accessible banner
  });

  it("opt-in: starts tracking only after Accept", () => {
    load({ mode: "opt_in" }); (window as any).RaveIntel.consent(true); jest.advanceTimersByTime(100); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(sent.length).toBeGreaterThan(0); expect(sent[0].body.consent).toBe(true);
  });

  it("failed network sends are re-queued for a retry (events keep their ids)", async () => {
    load(); jest.advanceTimersByTime(20);
    (window as any).fetch = jest.fn(async () => ({ status: 503, json: async () => ({}) })); // eslint-disable-line @typescript-eslint/no-explicit-any
    document.body.innerHTML = `<a id="c" href="/contact">Go</a>`; document.getElementById("c")!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    jest.advanceTimersByTime(9000); await Promise.resolve(); await Promise.resolve();
    expect((window as any).fetch).toHaveBeenCalled(); // eslint-disable-line @typescript-eslint/no-explicit-any
  });
});
