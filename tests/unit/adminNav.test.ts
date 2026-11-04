/** @jest-environment node */
import { NAV, isActive } from "@/components/os/shell/nav";

describe("admin navigation", () => {
  it("has a visible 'Live chats' entry pointing at the chat inbox", () => {
    const item = NAV.find((n) => n.label === "Live chats");
    expect(item?.href).toBe("/admin/conversations");
    expect(item?.badge).toBe("chats");
  });
  it("highlights Live chats (not Leads & Sales) on a chat page, and Leads & Sales on the leads page", () => {
    const chats = NAV.find((n) => n.label === "Live chats")!;
    const leads = NAV.find((n) => n.label === "Leads & Sales")!;
    expect(isActive(chats, "/admin/conversations")).toBe(true);
    expect(isActive(chats, "/admin/conversations/abc-123")).toBe(true);
    expect(isActive(leads, "/admin/conversations/abc-123")).toBe(false);
    expect(isActive(leads, "/admin/leads/5")).toBe(true);
    expect(isActive(chats, "/admin/leads/5")).toBe(false);
  });
  it("every entry has a unique destination", () => {
    const hrefs = NAV.map((n) => n.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
