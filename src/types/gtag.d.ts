// Extend the Window interface to include the gtag function injected by Google Analytics
interface Window {
  gtag: (
    command: "event" | "config" | "js" | "set",
    target: string | Date,
    params?: Record<string, unknown>
  ) => void;
  dataLayer: unknown[];
}
