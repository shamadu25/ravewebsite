import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const trackEvent = jest.fn();
jest.mock("@/lib/utils", () => ({ ...jest.requireActual("@/lib/utils"), trackEvent: (...a: unknown[]) => trackEvent(...a) }));
jest.mock("@/lib/formToken", () => ({ prefetchFormToken: jest.fn(), takeFormToken: jest.fn().mockResolvedValue("tok") }));

import LeadForm from "@/components/get-started/LeadForm";
import { SELECT_EVENT } from "@/components/get-started/FormCta";

const realFetch = global.fetch;
let fetchMock: jest.Mock;
beforeAll(() => {
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} };
});
beforeEach(() => {
  jest.clearAllMocks();
  window.sessionStorage.clear();
  window.localStorage.clear();
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterAll(() => { global.fetch = realFetch; });

const fill = () => {
  fireEvent.change(screen.getByLabelText(/^Full Name/), { target: { value: "Ama Mensah" } });
  fireEvent.change(screen.getByLabelText(/^Business Name/), { target: { value: "Ama Ltd" } });
  fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "+233 24 123 4567" } });
  fireEvent.change(screen.getByLabelText(/^Business Email/), { target: { value: "ama@company.com" } });
  fireEvent.change(screen.getByLabelText(/^Business Type/), { target: { value: "retail" } });
  fireEvent.change(screen.getByLabelText(/^Solution Required/), { target: { value: "pos" } });
};
const submit = () => fireEvent.click(screen.getByRole("button", { name: "GET MY FREE CONSULTATION" }));
const res = (status: number, json: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => json });
const events = (name: string) => trackEvent.mock.calls.filter((c) => c[0] === name);

describe("LeadForm — structure and accessibility", () => {
  it("shows the required copy, fields and privacy link", () => {
    render(<LeadForm />);
    expect(screen.getByRole("heading", { name: "TELL US ABOUT YOUR BUSINESS" })).toBeInTheDocument();
    expect(screen.getByText("Share a few details and our team will contact you about the right solution.")).toBeInTheDocument();
    expect(screen.getByText(/No obligation\. Your information is used to respond to your enquiry\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByLabelText(/^Full Name/)).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText(/^Business Name/)).toHaveAttribute("autocomplete", "organization");
    expect(screen.getByLabelText(/^Phone/)).toHaveAttribute("type", "tel");
    expect(screen.getByLabelText(/^Business Email/)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/Tell us more about what you need/)).not.toBeRequired();
  });
  it("lists all 13 solutions and 10 business types", () => {
    render(<LeadForm />);
    expect(screen.getByLabelText(/^Solution Required/).querySelectorAll("option")).toHaveLength(14); // 13 + placeholder
    expect(screen.getByLabelText(/^Business Type/).querySelectorAll("option")).toHaveLength(11);
  });
  it("preselects from the initial value and from a page CTA event, keeping the other options", () => {
    render(<LeadForm initialSolution="erp" />);
    const sel = screen.getByLabelText(/^Solution Required/) as HTMLSelectElement;
    expect(sel.value).toBe("erp");
    act(() => { window.dispatchEvent(new CustomEvent(SELECT_EVENT, { detail: { solution: "hotel-management" } })); });
    expect(sel.value).toBe("hotel-management");
    act(() => { window.dispatchEvent(new CustomEvent(SELECT_EVENT, { detail: { solution: "not-real" } })); });
    expect(sel.value).toBe("hotel-management"); // unknown values ignored
  });
});

describe("LeadForm — validation", () => {
  it("empty submit shows field errors, focuses the first, sends nothing and fires NO conversion", async () => {
    render(<LeadForm />);
    submit();
    expect(await screen.findByText("Please enter your full name.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Full Name/)).toHaveFocus();
    expect(screen.getByLabelText(/^Full Name/)).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(events("generate_lead")).toHaveLength(0);
    expect(events("lead_form_error")[0][1]).toMatchObject({ error_type: "validation" });
  });
  it("rejects an invalid email", async () => {
    render(<LeadForm />);
    fill();
    fireEvent.change(screen.getByLabelText(/^Business Email/), { target: { value: "nope" } });
    submit();
    expect(await screen.findByText(/Enter a valid email address/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("LeadForm — submission and conversion tracking", () => {
  it("success: posts once with attribution + idempotency id, fires generate_lead ONCE after the server confirms", async () => {
    window.history.replaceState(null, "", "/get-started?utm_source=facebook&utm_campaign=c1&fbclid=F1");
    fetchMock.mockResolvedValue(res(200, { success: true, eventId: "evt-1" }));
    render(<LeadForm initialSolution="pos" />);
    fill();
    expect(events("generate_lead")).toHaveLength(0);
    submit();
    expect(await screen.findByText("YOUR ENQUIRY HAS BEEN RECEIVED.")).toBeInTheDocument();
    expect(screen.getByText(/Thank you for contacting RaveSoft\. Our team will review your requirements/)).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload).toMatchObject({ formType: "get_started", fullName: "Ama Mensah", solution: "pos", formToken: "tok" });
    expect(payload.submissionId).toBeTruthy();
    expect(payload.attribution.latest).toMatchObject({ utm_source: "facebook", utm_campaign: "c1", fbclid: "F1" });

    expect(events("generate_lead")).toHaveLength(1);
    const [, params, opts] = events("generate_lead")[0];
    expect(opts).toMatchObject({ eventId: "evt-1", metaStandard: "Lead" });
    expect(JSON.stringify(params)).not.toMatch(/ama@company|Mensah|233 24/); // no personal data to analytics
  });

  it("double click sends ONE request", async () => {
    let release!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => { release = r; }));
    render(<LeadForm initialSolution="pos" />);
    fill();
    const btn = screen.getByRole("button", { name: "GET MY FREE CONSULTATION" });
    fireEvent.click(btn); fireEvent.click(btn); fireEvent.click(btn); // a real double/triple click hits the same element
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => { await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /SENDING/ })).toBeDisabled();
    release(res(200, { success: true, eventId: "e" }));
    await screen.findByText("YOUR ENQUIRY HAS BEEN RECEIVED.");
    expect(events("generate_lead")).toHaveLength(1);
  });

  it.each([[500, { error: "We couldn't save your enquiry just now.", code: "persist_failed" }], [429, { error: "Too many" }], [422, { error: "Nope", code: "content:x" }]])(
    "server error %i: no success, NO generate_lead, entered data retained, error announced", async (status, json) => {
      fetchMock.mockResolvedValue(res(status as number, json));
      render(<LeadForm initialSolution="pos" />);
      fill();
      submit();
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.queryByText("YOUR ENQUIRY HAS BEEN RECEIVED.")).not.toBeInTheDocument();
      expect(events("generate_lead")).toHaveLength(0);
      expect(events("lead_form_error").length).toBeGreaterThan(0);
      expect((screen.getByLabelText(/^Full Name/) as HTMLInputElement).value).toBe("Ama Mensah");
      expect((screen.getByLabelText(/^Business Email/) as HTMLInputElement).value).toBe("ama@company.com");
      expect(screen.getByRole("button", { name: "GET MY FREE CONSULTATION" })).toBeEnabled(); // can retry
    });

  it("network failure: no success, no conversion, data retained", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(<LeadForm initialSolution="pos" />);
    fill();
    submit();
    expect(await screen.findByText(/couldn.t reach our server/)).toBeInTheDocument();
    expect(events("generate_lead")).toHaveLength(0);
    expect((screen.getByLabelText(/^Business Name/) as HTMLInputElement).value).toBe("Ama Ltd");
  });

  it("server-side field errors are shown against the right fields", async () => {
    fetchMock.mockResolvedValue(res(422, { error: "Please check the highlighted fields.", code: "invalid", fields: { phone: "Enter a valid phone or WhatsApp number." } }));
    render(<LeadForm initialSolution="pos" />);
    fill();
    submit();
    expect(await screen.findByText("Enter a valid phone or WhatsApp number.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Phone/)).toHaveAttribute("aria-invalid", "true");
    expect(events("generate_lead")).toHaveLength(0);
  });

  it("a repeat of an earlier enquiry (duplicate: similar) shows success but does NOT fire another conversion", async () => {
    fetchMock.mockResolvedValue(res(200, { success: true, eventId: "evt-2", duplicate: "similar" }));
    render(<LeadForm initialSolution="pos" />);
    fill();
    submit();
    await screen.findByText("YOUR ENQUIRY HAS BEEN RECEIVED.");
    expect(events("generate_lead")).toHaveLength(0);
  });

  it("a retry of the same submission after a lost response fires the conversion once", async () => {
    fetchMock.mockRejectedValueOnce(new Error("lost")).mockResolvedValueOnce(res(200, { success: true, eventId: "evt-3", duplicate: "same_submission" }));
    render(<LeadForm initialSolution="pos" />);
    fill();
    submit();
    await screen.findByText(/couldn.t reach our server/);
    submit();
    await screen.findByText("YOUR ENQUIRY HAS BEEN RECEIVED.");
    expect(events("generate_lead")).toHaveLength(1);
    const ids = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).submissionId);
    expect(ids[0]).toBe(ids[1]); // same idempotency key on retry
  });

  it("fires lead_form_start once, and step completion once per group", async () => {
    render(<LeadForm />);
    const name = screen.getByLabelText(/^Full Name/);
    fireEvent.focus(name); fireEvent.focus(name);
    expect(events("lead_form_start")).toHaveLength(1);
    fill();
    ["Full Name", "Business Name", "Phone", "Business Email", "Business Type", "Solution Required"].forEach((l) => fireEvent.blur(screen.getByLabelText(new RegExp(`^${l}`))));
    await waitFor(() => expect(events("lead_form_step_complete")).toHaveLength(2));
    expect(events("lead_form_step_complete").map((c) => c[1].step).sort()).toEqual(["contact_details", "requirements"]);
  });

  it("the WhatsApp follow-up uses the website's configured number and contains no personal data", async () => {
    fetchMock.mockResolvedValue(res(200, { success: true, eventId: "e9" }));
    render(<LeadForm initialSolution="pos" />);
    fill();
    submit();
    const link = await screen.findByRole("link", { name: /Message us on WhatsApp/ });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/233531561484\?text=/);
    expect(decodeURIComponent(link.getAttribute("href")!)).not.toMatch(/Ama|company\.com/);
  });
});
