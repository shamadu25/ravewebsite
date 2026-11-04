import { render, fireEvent } from "@testing-library/react";

const trackEvent = jest.fn();
jest.mock("@/lib/utils", () => ({ ...jest.requireActual("@/lib/utils"), trackEvent: (...a: unknown[]) => trackEvent(...a) }));

import CommercialVideo from "@/components/ui/CommercialVideo";

const setup = () => {
  const { container } = render(<CommercialVideo />);
  return container.querySelector("video") as HTMLVideoElement;
};
const time = (v: HTMLVideoElement, current: number, duration = 100) => {
  Object.defineProperty(v, "duration", { value: duration, configurable: true });
  Object.defineProperty(v, "currentTime", { value: current, configurable: true, writable: true });
  fireEvent.timeUpdate(v);
};
const names = () => trackEvent.mock.calls.map((c) => c[0]);

beforeEach(() => trackEvent.mockClear());

describe("CommercialVideo", () => {
  it("never downloads until played, never autoplays, and is accessible", () => {
    const v = setup();
    expect(v.getAttribute("preload")).toBe("none");
    expect(v.autoplay).toBe(false);
    expect(v.hasAttribute("controls")).toBe(true);
    expect(v.hasAttribute("playsinline")).toBe(true);
    expect(v.getAttribute("poster")).toBe("/video/ravesoft-commercial-poster.webp");
    expect(v.getAttribute("aria-label")).toMatch(/commercial/i);
    expect(v.querySelector("source")?.getAttribute("src")).toBe("/video/ravesoft-commercial-720p.mp4");
  });
  it("reserves a 16:9 box so it cannot shift the layout", () => {
    const { container } = render(<CommercialVideo />);
    expect((container.firstChild as HTMLElement).className).toContain("aspect-video");
  });
  it("offers a download link when the browser cannot play video", () => {
    const v = setup();
    expect(v.querySelector("a")?.getAttribute("href")).toBe("/video/ravesoft-commercial-720p.mp4");
  });
  it("reports play once, 25/50/75% once each, and completion", () => {
    const v = setup();
    fireEvent.play(v); fireEvent.play(v);
    time(v, 10); time(v, 30); time(v, 30); time(v, 60); time(v, 80); time(v, 80);
    fireEvent.ended(v);
    expect(names()).toEqual(["video_play", "video_progress", "video_progress", "video_progress", "video_complete"]);
    expect(trackEvent.mock.calls.filter((c) => c[0] === "video_progress").map((c) => c[1].percent)).toEqual([25, 50, 75]);
  });
  it("sends no personal data", () => {
    const v = setup();
    fireEvent.play(v);
    expect(JSON.stringify(trackEvent.mock.calls)).not.toMatch(/@|\+\d{6}/);
  });
});
