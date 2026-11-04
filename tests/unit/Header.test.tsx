import { render, screen, fireEvent, within } from "@testing-library/react";

let mockPath = "/";
jest.mock("next/navigation", () => ({ usePathname: () => mockPath }));

import Header from "@/components/layout/Header";
import { NAV_LINKS, NAV_SERVICES, PRODUCTS } from "@/lib/data";

beforeEach(() => { mockPath = "/"; });

describe("Header — desktop dropdowns", () => {
  it("has Products and Services buttons that start collapsed", () => {
    render(<Header />);
    for (const name of ["Products", "Services"]) {
      const b = screen.getByRole("button", { name });
      expect(b).toHaveAttribute("aria-expanded", "false");
      expect(b).toHaveAttribute("aria-controls");
    }
  });

  it("opens the Products menu with every product, and links to /products", () => {
    render(<Header />);
    const btn = screen.getByRole("button", { name: "Products" });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(btn.getAttribute("aria-controls") as string) as HTMLElement;
    for (const p of PRODUCTS) expect(within(panel).getByRole("link", { name: new RegExp(p.name) })).toHaveAttribute("href", p.href);
    expect(within(panel).getByRole("link", { name: /All Products/ })).toHaveAttribute("href", "/products");
  });

  it("only one menu is open at a time", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: "Products" }));
    fireEvent.click(screen.getByRole("button", { name: "Services" }));
    expect(screen.getByRole("button", { name: "Services" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Products" })).toHaveAttribute("aria-expanded", "false");
  });

  it("Escape closes an open menu and returns focus to its button", () => {
    render(<Header />);
    const btn = screen.getByRole("button", { name: "Products" });
    fireEvent.click(btn);
    fireEvent.keyDown(btn, { key: "Escape" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(btn).toHaveFocus();
  });

  it("closed panels are hidden from the tab order (invisible), open ones are not", () => {
    render(<Header />);
    const btn = screen.getByRole("button", { name: "Products" });
    const panel = document.getElementById(btn.getAttribute("aria-controls") as string) as HTMLElement;
    expect(panel.className).toContain("invisible");
    fireEvent.click(btn);
    expect(panel.className).not.toContain("invisible");
  });

  it("lists the AI Solutions link and keeps the main CTAs", () => {
    render(<Header />);
    expect(screen.getAllByRole("link", { name: "AI Solutions" })[0]).toHaveAttribute("href", "/ai-employee");
    expect(screen.getAllByRole("link", { name: /Book a Free Consultation/ })[0]).toHaveAttribute("href", "/book-consultation");
    expect(screen.getAllByRole("link", { name: "Contact" })[0]).toHaveAttribute("href", "/contact");
  });

  it("has a skip link to the main content", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /Skip to main content/ })).toHaveAttribute("href", "#main-content");
  });

  it("marks the parent menu active on a child page", () => {
    mockPath = "/products/cliqpos";
    render(<Header />);
    expect(screen.getByRole("button", { name: "Products" }).className).toContain("text-blue-400");
  });
});

describe("Header — mobile menu", () => {
  const open = () => fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

  it("toggle exposes state and a changing label", () => {
    render(<Header />);
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
  });

  it("includes Home, AI Solutions and expandable Products and Services accordions", () => {
    render(<Header />);
    open();
    const mobile = screen.getByRole("navigation", { name: "Mobile" });
    expect(within(mobile).getByRole("link", { name: /^Home/ })).toHaveAttribute("href", "/");
    expect(within(mobile).getByRole("link", { name: /AI Solutions/ })).toHaveAttribute("href", "/ai-employee");

    const products = within(mobile).getByRole("button", { name: "Products" });
    expect(products).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(products);
    expect(products).toHaveAttribute("aria-expanded", "true");
    for (const p of PRODUCTS) expect(within(mobile).getByRole("link", { name: new RegExp(p.name) })).toHaveAttribute("href", p.href);

    fireEvent.click(within(mobile).getByRole("button", { name: "Services" }));
    for (const s of NAV_SERVICES) expect(within(mobile).getByRole("link", { name: new RegExp(s.label) })).toHaveAttribute("href", s.href);
  });

  it("Escape closes the mobile menu", () => {
    render(<Header />);
    open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });

  it("flags the body while open so the chat launcher can be hidden", () => {
    render(<Header />);
    open();
    expect(document.body.dataset.mobileNavOpen).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(document.body.dataset.mobileNavOpen).toBeUndefined();
  });

  it("locks body scroll while open and releases it on close", () => {
    render(<Header />);
    open();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(document.body.style.overflow).toBe("");
  });
});

describe("Header — hidden on the paid-ads funnel", () => {
  it("renders nothing on /ai-employee", () => {
    mockPath = "/ai-employee";
    const { container } = render(<Header />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Navigation data", () => {
  it("every nav link has a label and no duplicates", () => {
    const hrefs = NAV_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
