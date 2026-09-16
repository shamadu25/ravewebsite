// Extend the Window interface to include the gtag function injected by Google Analytics
interface Window {
  gtag: (
    command: "event" | "config" | "js" | "set",
    target: string | Date,
    params?: Record<string, unknown>
  ) => void;
  dataLayer: unknown[];
  // Meta Pixel — injected by the pixel loader script, undefined until NEXT_PUBLIC_META_PIXEL_ID is set
  fbq?: (command: "track" | "trackCustom" | "init", target: string, params?: Record<string, unknown>) => void;
  clarity?: (command: "event" | "identify" | "set", ...args: unknown[]) => void;
}
